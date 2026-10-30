<?php

namespace App\Services;

use App\Models\ProductVariant;
use App\Models\StoreSetting;
use Illuminate\Support\Collection;

/**
 * Prices a browser cart using trusted database values. The browser only
 * sends variant ids, quantities and optional customization text.
 */
class CartService
{
    public function __construct(private InventoryService $inventory) {}

    /**
     * @param  array<int, array{variant_id:int, quantity:int, customization?:array|null}>  $items
     */
    public function quote(array $items, ?string $shippingCode = null): array
    {
        $variants = ProductVariant::with(['product.media', 'deviceModel', 'components.product', 'components.deviceModel'])
            ->whereIn('id', collect($items)->pluck('variant_id')->unique())
            ->get()->keyBy('id');

        $maxQty = config('noire.max_line_quantity');
        $lines = [];
        $demand = []; // physical variant id => units requested across all lines

        foreach ($items as $index => $item) {
            $variant = $variants->get($item['variant_id']);
            $issues = [];
            $sellable = $variant && $variant->is_active && $variant->product && $variant->product->status === 'published' && ! $variant->product->trashed();

            if (! $sellable) {
                $lines[] = ['key' => $index, 'variant_id' => $item['variant_id'], 'available' => false, 'quantity' => 0, 'issues' => ['This item is no longer available.'], 'line_total' => '0.00'];

                continue;
            }

            $quantity = max(1, min((int) $item['quantity'], $maxQty));
            $stock = $variant->availableStock();
            if ($stock <= 0) {
                $issues[] = 'Sold out';
            } elseif ($quantity > $stock) {
                $issues[] = "Only {$stock} available";
            }

            foreach ($this->inventory->physicalUnits($variant, $quantity) as $id => $units) {
                $demand[$id] = ($demand[$id] ?? 0) + $units;
            }

            $customization = $variant->product->is_customizable ? $this->cleanCustomization($item['customization'] ?? null) : null;
            $lines[] = [
                'key' => $index,
                'variant_id' => $variant->id,
                'product' => [
                    'id' => $variant->product->id,
                    'name' => $variant->product->name,
                    'slug' => $variant->product->slug,
                    'type' => $variant->product->type,
                    'is_handmade' => $variant->product->is_handmade,
                    'image' => $this->imageFor($variant),
                ],
                'sku' => $variant->sku,
                'device_model' => $variant->deviceModel?->name,
                'color_name' => $variant->color_name,
                'color_hex' => $variant->color_hex,
                'unit_price' => $this->money($variant->price),
                'compare_at_price' => $variant->isBundle() ? $variant->componentsValue() : $variant->compare_at_price,
                'quantity' => $quantity,
                'stock' => $stock,
                'available' => $stock > 0,
                'line_total' => $this->money($variant->price * $quantity),
                'customization' => $customization,
                'components' => $variant->isBundle() ? $variant->components->map(fn ($c) => [
                    'variant_id' => $c->id, 'name' => $c->product->name, 'sku' => $c->sku, 'label' => $c->label(), 'quantity' => $c->pivot->quantity,
                ])->values()->all() : null,
                'issues' => $issues,
            ];
        }

        // Shared component stock (e.g. a case bought alone and inside a bundle).
        $physical = ProductVariant::whereIn('id', array_keys($demand))->pluck('stock', 'id');
        $shortages = collect($demand)->filter(fn ($units, $id) => $units > ($physical[$id] ?? 0))->keys()->all();

        $subtotal = collect($lines)->sum(fn ($l) => (float) $l['line_total']);
        $shipping = $this->shippingOptions($subtotal);
        $selected = collect($shipping)->firstWhere('code', $shippingCode) ?? $shipping[0] ?? null;
        $shippingTotal = collect($lines)->where('available', true)->isEmpty() ? 0 : (float) ($selected['fee'] ?? 0);

        return [
            'lines' => $lines,
            'count' => collect($lines)->sum('quantity'),
            'subtotal' => $this->money($subtotal),
            'shipping_options' => $shipping,
            'shipping_method' => $selected['code'] ?? null,
            'shipping_total' => $this->money($shippingTotal),
            'total' => $this->money($subtotal + $shippingTotal),
            'free_shipping_threshold' => StoreSetting::read('shipping')['free_threshold'] ?? null,
            'currency' => config('noire.currency'),
            'shortage_variant_ids' => $shortages,
            'can_checkout' => collect($lines)->isNotEmpty()
                && collect($lines)->every(fn ($l) => $l['available'] && empty($l['issues']))
                && empty($shortages),
        ];
    }

    /** @return array<int, array{code:string,name:string,fee:string,estimate:string}> */
    public function shippingOptions(float $subtotal): array
    {
        $settings = StoreSetting::read('shipping', []);
        $threshold = $settings['free_threshold'] ?? null;

        return collect($settings['methods'] ?? [])
            ->where('enabled', true)
            ->map(function ($m) use ($threshold, $subtotal) {
                $free = ($m['free_eligible'] ?? false) && $threshold !== null && $subtotal >= (float) $threshold;

                return [
                    'code' => $m['code'],
                    'name' => $m['name'],
                    'fee' => $this->money($free ? 0 : (float) $m['fee']),
                    'estimate' => $m['estimate'] ?? '',
                    'is_free' => $free,
                ];
            })->values()->all();
    }

    private function imageFor(ProductVariant $variant): ?string
    {
        $media = $variant->product->media->where('type', 'image');

        return ($media->firstWhere('color_name', $variant->color_name) ?? $media->first())?->url;
    }

    private function cleanCustomization(?array $c): ?array
    {
        if (! $c) {
            return null;
        }
        $clean = array_filter([
            'text' => mb_substr(trim(strip_tags((string) ($c['text'] ?? ''))), 0, 20),
            'colors' => mb_substr(trim(strip_tags((string) ($c['colors'] ?? ''))), 0, 60),
            'instructions' => mb_substr(trim(strip_tags((string) ($c['instructions'] ?? ''))), 0, 300),
        ], fn ($v) => $v !== '');

        return $clean ?: null;
    }

    private function money(float|string $value): string
    {
        return number_format((float) $value, 2, '.', '');
    }
}
