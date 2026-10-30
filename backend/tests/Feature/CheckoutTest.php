<?php

namespace Tests\Feature;

use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Services\OrderService;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    public function test_quote_uses_trusted_database_prices(): void
    {
        $v = $this->stockedVariant();
        $res = $this->postJson('/api/v1/cart/quote', ['items' => [['variant_id' => $v->id, 'quantity' => 2, 'price' => '0.01']]])->assertOk();

        $this->assertSame(number_format($v->price * 2, 2, '.', ''), $res->json('subtotal'));
        $this->assertTrue($res->json('can_checkout'));
    }

    public function test_quote_flags_quantities_above_stock(): void
    {
        $v = $this->stockedVariant();
        $v->update(['stock' => 1]);
        $res = $this->postJson('/api/v1/cart/quote', ['items' => [['variant_id' => $v->id, 'quantity' => 3]]])->assertOk();
        $this->assertFalse($res->json('can_checkout'));
        $this->assertSame(['Only 1 available'], $res->json('lines.0.issues'));
    }

    public function test_checkout_creates_order_and_deducts_stock(): void
    {
        $v = $this->stockedVariant();
        $before = $v->stock;

        $res = $this->postJson('/api/v1/checkout', $this->checkoutPayload([['variant_id' => $v->id, 'quantity' => 2]]))->assertCreated();

        $order = Order::where('number', $res->json('number'))->firstOrFail();
        $this->assertTrue($order->is_demo);
        $this->assertSame('pending', $order->status);
        $this->assertSame($before - 2, $v->refresh()->stock);
        $this->assertSame((float) $v->price * 2 + 4.0, (float) $order->total); // standard delivery $4 below free threshold
        $this->assertDatabaseHas('order_items', ['order_id' => $order->id, 'sku' => $v->sku, 'quantity' => 2]);
        $this->assertDatabaseHas('inventory_movements', ['product_variant_id' => $v->id, 'change' => -2, 'reason' => 'order', 'reference' => $order->number]);

        // Confirmation is only visible with the private token.
        $this->getJson("/api/v1/orders/{$order->number}")->assertNotFound();
        $this->getJson("/api/v1/orders/{$order->number}?token={$res->json('token')}")->assertOk()->assertJsonPath('items.0.sku', $v->sku);
    }

    public function test_cannot_order_more_than_available_stock(): void
    {
        $v = $this->stockedVariant();
        $v->update(['stock' => 2]);
        $this->postJson('/api/v1/checkout', $this->checkoutPayload([['variant_id' => $v->id, 'quantity' => 3]]))->assertUnprocessable()->assertJsonValidationErrors('items');
        $this->assertSame(2, $v->refresh()->stock);
        $this->assertSame(0, Order::count());
    }

    public function test_simulated_card_requires_explicit_confirmation(): void
    {
        $v = $this->stockedVariant();
        $payload = $this->checkoutPayload([['variant_id' => $v->id, 'quantity' => 1]], ['payment_method' => 'demo_card']);
        $this->postJson('/api/v1/checkout', $payload)->assertUnprocessable()->assertJsonValidationErrors('simulate_payment');

        $res = $this->postJson('/api/v1/checkout', [...$payload, 'simulate_payment' => true])->assertCreated();
        $order = Order::where('number', $res->json('number'))->first();
        $this->assertSame('paid_simulated', $order->payment_status);
        $this->assertStringStartsWith('SIM-', $order->payment_reference);
    }

    public function test_checkout_validates_customer_details(): void
    {
        $v = $this->stockedVariant();
        $this->postJson('/api/v1/checkout', $this->checkoutPayload([['variant_id' => $v->id, 'quantity' => 1]], ['email' => 'nope', 'country' => 'Atlantis', 'phone' => 'abc']))
            ->assertUnprocessable()->assertJsonValidationErrors(['email', 'country', 'phone']);
    }

    public function test_bundle_checkout_deducts_each_component_once(): void
    {
        $bundle = $this->bundleVariant();
        $components = $bundle->components->mapWithKeys(fn ($c) => [$c->id => $c->stock]);

        $this->postJson('/api/v1/checkout', $this->checkoutPayload([['variant_id' => $bundle->id, 'quantity' => 2]]))->assertCreated();

        foreach ($components as $id => $stock) {
            $this->assertSame($stock - 2, ProductVariant::find($id)->stock);
        }
        $this->assertSame(0, $bundle->refresh()->stock); // bundles hold no stock of their own
    }

    public function test_shared_component_stock_is_checked_across_lines(): void
    {
        $bundle = $this->bundleVariant();
        $case = $bundle->components->first(fn ($c) => $c->product->type === 'case');
        $case->update(['stock' => 1]);
        $bundle->components()->where('component_variant_id', '!=', $case->id)->first()?->update(['stock' => 5]);

        // One case alone + one set containing the same case = 2 units of a 1-unit variant.
        $this->postJson('/api/v1/checkout', $this->checkoutPayload([
            ['variant_id' => $case->id, 'quantity' => 1],
            ['variant_id' => $bundle->id, 'quantity' => 1],
        ]))->assertUnprocessable();
        $this->assertSame(1, $case->refresh()->stock);
    }

    public function test_cancellation_restores_stock_exactly_once(): void
    {
        $v = $this->stockedVariant();
        $before = $v->stock;
        $orders = app(OrderService::class);
        $order = $orders->place($this->checkoutPayload([]), [['variant_id' => $v->id, 'quantity' => 2]]);
        $this->assertSame($before - 2, $v->refresh()->stock);

        $orders->transition($order, 'cancelled');
        $this->assertSame($before, $v->refresh()->stock);

        // A cancelled order is terminal: no second restock, no reopening.
        $this->expectException(ValidationException::class);
        try {
            $orders->transition($order->refresh(), 'confirmed');
        } finally {
            $this->assertSame($before, $v->refresh()->stock);
            $this->assertSame(1, InventoryMovement::where('reason', 'cancellation')->where('reference', $order->number)->count());
        }
    }

    public function test_status_can_only_move_forward(): void
    {
        $orders = app(OrderService::class);
        $order = $orders->place($this->checkoutPayload([]), [['variant_id' => $this->stockedVariant()->id, 'quantity' => 1]]);
        $orders->transition($order, 'shipped');

        $this->expectException(ValidationException::class);
        $orders->transition($order->refresh(), 'preparing');
    }

    public function test_unpublished_products_cannot_be_ordered(): void
    {
        $v = $this->stockedVariant();
        $v->product->update(['status' => 'draft']);
        $this->postJson('/api/v1/checkout', $this->checkoutPayload([['variant_id' => $v->id, 'quantity' => 1]]))->assertUnprocessable();
    }

    public function test_customization_only_kept_for_customizable_products(): void
    {
        $custom = ProductVariant::whereHas('product', fn ($p) => $p->where('is_customizable', true))->where('stock', '>', 0)->first();
        $plain = ProductVariant::whereHas('product', fn ($p) => $p->where('is_customizable', false)->where('type', 'case'))->where('stock', '>', 0)->first();
        $res = $this->postJson('/api/v1/cart/quote', ['items' => [
            ['variant_id' => $custom->id, 'quantity' => 1, 'customization' => ['text' => 'L.H.']],
            ['variant_id' => $plain->id, 'quantity' => 1, 'customization' => ['text' => 'L.H.']],
        ]])->assertOk();
        $this->assertSame('L.H.', $res->json('lines.0.customization.text'));
        $this->assertNull($res->json('lines.1.customization'));
    }
}
