<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Demo order lifecycle. Inventory policy: stock is deducted when the order
 * is placed and restored exactly once if it is cancelled.
 */
class OrderService
{
    public function __construct(private CartService $cart, private InventoryService $inventory) {}

    /**
     * @param  array<string, mixed>  $customer  validated checkout fields
     * @param  array<int, array>  $items
     */
    public function place(array $customer, array $items, ?int $userId = null): Order
    {
        return DB::transaction(function () use ($customer, $items, $userId) {
            // Lock every physical variant involved (sorted to avoid deadlocks), then re-price under the lock.
            $sellable = ProductVariant::with('product', 'components')->whereIn('id', collect($items)->pluck('variant_id'))->get();
            $physicalIds = $sellable->flatMap(fn ($v) => $v->isBundle() ? $v->components->pluck('id') : [$v->id])->unique()->sort()->values();
            ProductVariant::whereIn('id', $physicalIds)->lockForUpdate()->get();

            $quote = $this->cart->quote($items, $customer['shipping_method'] ?? null);
            if (! $quote['can_checkout']) {
                throw ValidationException::withMessages(['items' => 'Some items in your bag are unavailable or exceed available stock. Please review your bag.']);
            }
            $shipping = collect($quote['shipping_options'])->firstWhere('code', $customer['shipping_method']);
            if (! $shipping) {
                throw ValidationException::withMessages(['shipping_method' => 'Please choose a delivery method.']);
            }

            $simulatedPaid = $customer['payment_method'] === 'demo_card';
            $order = Order::create([
                'number' => $this->nextNumber(),
                'access_token' => Str::random(48),
                'user_id' => $userId,
                'status' => 'pending',
                'payment_method' => $customer['payment_method'],
                'payment_status' => $simulatedPaid ? 'paid_simulated' : 'unpaid',
                'payment_reference' => $simulatedPaid ? 'SIM-'.strtoupper(Str::random(10)) : null,
                'first_name' => $customer['first_name'],
                'last_name' => $customer['last_name'],
                'email' => $customer['email'],
                'phone' => $customer['phone'],
                'country' => $customer['country'],
                'city' => $customer['city'],
                'address_line1' => $customer['address_line1'],
                'address_line2' => $customer['address_line2'] ?? null,
                'customer_notes' => $customer['notes'] ?? null,
                'shipping_method' => $shipping['name'],
                'subtotal' => $quote['subtotal'],
                'shipping_total' => $shipping['fee'],
                'total' => number_format((float) $quote['subtotal'] + (float) $shipping['fee'], 2, '.', ''),
                'currency' => config('noire.currency'),
                'is_demo' => config('noire.demo_mode'),
                'placed_at' => now(),
            ]);

            foreach ($quote['lines'] as $line) {
                $variant = $sellable->firstWhere('id', $line['variant_id']);
                $order->items()->create([
                    'product_id' => $line['product']['id'],
                    'product_variant_id' => $variant->id,
                    'product_name' => $line['product']['name'],
                    'product_type' => $line['product']['type'],
                    'sku' => $line['sku'],
                    'device_model' => $line['device_model'],
                    'color_name' => $line['color_name'],
                    'image_url' => $line['product']['image'],
                    'unit_price' => $line['unit_price'],
                    'quantity' => $line['quantity'],
                    'line_total' => $line['line_total'],
                    'customization' => $line['customization'],
                    'components' => $line['components'],
                ]);
                foreach ($this->inventory->physicalUnits($variant, $line['quantity']) as $id => $units) {
                    $this->inventory->adjust(ProductVariant::find($id), -$units, 'order', $order->number);
                }
            }

            OrderStatusHistory::create(['order_id' => $order->id, 'to_status' => 'pending', 'note' => 'Demo order placed']);

            return $order->load('items');
        });
    }

    public function transition(Order $order, string $to, ?int $userId = null, ?string $note = null): Order
    {
        $from = $order->status;
        if ($from === $to) {
            return $order;
        }
        if (in_array($from, ['cancelled', 'delivered'], true)) {
            throw ValidationException::withMessages(['status' => "A {$from} order can no longer change status."]);
        }
        if ($to === 'cancelled') {
            if ($from === 'shipped') {
                throw ValidationException::withMessages(['status' => 'Shipped orders cannot be cancelled.']);
            }
        } elseif (array_search($to, Order::FLOW, true) <= array_search($from, Order::FLOW, true)) {
            throw ValidationException::withMessages(['status' => 'Orders can only move forward: '.implode(' → ', Order::FLOW).'.']);
        }

        return DB::transaction(function () use ($order, $from, $to, $userId, $note) {
            $order = Order::whereKey($order->id)->lockForUpdate()->first();
            if ($to === 'cancelled' && ! $order->inventory_restored_at) {
                foreach ($order->items as $item) {
                    $units = $item->components
                        ? collect($item->components)->mapWithKeys(fn ($c) => [$c['variant_id'] => $c['quantity'] * $item->quantity])->all()
                        : [$item->product_variant_id => $item->quantity];
                    foreach ($units as $variantId => $qty) {
                        if ($variant = ProductVariant::find($variantId)) {
                            $this->inventory->adjust($variant, $qty, 'cancellation', $order->number, null, $userId);
                        }
                    }
                }
                $order->inventory_restored_at = now();
            }
            $order->status = $to;
            $order->save();
            OrderStatusHistory::create(['order_id' => $order->id, 'from_status' => $from, 'to_status' => $to, 'note' => $note, 'user_id' => $userId]);

            return $order;
        });
    }

    public function recordSimulatedRefund(Order $order, float $amount, ?int $userId = null): Order
    {
        $remaining = (float) $order->total - (float) $order->refunded_amount;
        if ($amount <= 0 || $amount > $remaining + 0.001) {
            throw ValidationException::withMessages(['amount' => 'Refund must be between 0.01 and '.number_format($remaining, 2).'.']);
        }
        $order->refunded_amount = (float) $order->refunded_amount + $amount;
        $order->payment_status = abs((float) $order->refunded_amount - (float) $order->total) < 0.001 ? 'refunded_simulated' : 'partially_refunded_simulated';
        $order->save();
        OrderStatusHistory::create([
            'order_id' => $order->id, 'from_status' => $order->status, 'to_status' => $order->status,
            'note' => 'Simulated refund recorded: $'.number_format($amount, 2).' (no money moved)', 'user_id' => $userId,
        ]);

        return $order;
    }

    private function nextNumber(): string
    {
        do {
            $number = config('noire.order_prefix').'-'.now()->format('ymd').'-'.strtoupper(Str::random(4));
        } while (Order::where('number', $number)->exists());

        return $number;
    }
}
