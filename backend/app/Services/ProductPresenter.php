<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;

/** Shapes products for the storefront API (card + detail views). */
class ProductPresenter
{
    public const CARD_RELATIONS = ['media', 'collections', 'activeVariants.deviceModel', 'activeVariants.components', 'activeVariants.product'];

    public function card(Product $product): array
    {
        $variants = $product->activeVariants;
        $images = $product->media->where('type', 'image')->values();
        $prices = $variants->map(fn ($v) => (float) $v->price);
        $cheapest = $variants->sortBy(fn ($v) => (float) $v->price)->first();
        $compare = $cheapest ? ($cheapest->isBundle() ? $cheapest->componentsValue() : $cheapest->compare_at_price) : null;
        $inStock = $variants->contains(fn ($v) => $v->availableStock() > 0);

        return [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'type' => $product->type,
            'collection' => $product->collections->first()?->only(['name', 'slug']),
            'short_description' => $product->short_description,
            'material' => $product->material,
            'price' => $this->money($prices->min() ?? 0),
            'price_max' => $this->money($prices->max() ?? 0),
            'compare_at_price' => $compare && (float) $compare > (float) ($cheapest->price ?? 0) ? $this->money($compare) : null,
            'image' => $images->get(0)?->only(['url', 'alt']),
            // Alternate view of the SAME colour only (e.g. angled shot). Never another colour's photo,
            // otherwise hovering a card would show a colour the customer didn't pick.
            'hover_image' => $images->slice(1)->first(fn ($m) => $m->color_name === null || $m->color_name === $images->get(0)?->color_name)?->only(['url', 'alt']),
            // Per-colour image + availability so cards can switch colour without a round trip.
            'colors' => $variants->groupBy('color_name')->map(fn ($group, $name) => [
                'name' => $name,
                'hex' => $group->first()->color_hex,
                'in_stock' => $group->contains(fn ($v) => $v->availableStock() > 0),
                'image' => $images->firstWhere('color_name', $name)?->url,
            ])->values(),
            'models' => $variants->pluck('deviceModel.short_name')->filter()->unique()->values(),
            'labels' => $this->labels($product),
            'in_stock' => $inStock,
            'is_customizable' => $product->is_customizable,
            // Quick add is only offered when there is exactly one sellable choice — no guessing SKUs.
            'quick_add_variant_id' => $variants->count() === 1 && $inStock ? $variants->first()->id : null,
            'variant_count' => $variants->count(),
        ];
    }

    public function detail(Product $product): array
    {
        $product->loadMissing(['media', 'collections', 'activeVariants.deviceModel', 'activeVariants.components.product.media', 'activeVariants.components.deviceModel']);

        return [
            ...$this->card($product),
            'description' => $product->description,
            'care_instructions' => $product->care_instructions,
            'specs' => $product->specs ?? [],
            'video_url' => $product->video_url,
            'is_handmade' => $product->is_handmade,
            'is_limited_edition' => $product->is_limited_edition,
            'production_days' => $product->is_handmade && $product->production_days_min
                ? ['min' => $product->production_days_min, 'max' => $product->production_days_max] : null,
            'collections' => $product->collections->map->only(['name', 'slug'])->values(),
            'media' => $product->media->map(fn ($m) => [
                'id' => $m->id, 'type' => $m->type, 'url' => $m->url, 'alt' => $m->alt ?: $product->name, 'color_name' => $m->color_name,
                'width' => $m->width, 'height' => $m->height,
            ])->values(),
            'variants' => $product->activeVariants->map(fn (ProductVariant $v) => $this->variant($v))->values(),
            'device_models' => $product->activeVariants->pluck('deviceModel')->filter()->unique('id')->sortBy('sort_order')
                ->map->only(['id', 'name', 'short_name', 'slug'])->values(),
            'seo' => [
                'title' => $product->seo_title ?: $product->name.' — NOIRÉ',
                'description' => $product->seo_description ?: $product->short_description,
            ],
        ];
    }

    public function variant(ProductVariant $v): array
    {
        $stock = $v->availableStock();

        return [
            'id' => $v->id,
            'sku' => $v->sku,
            'device_model_id' => $v->device_model_id,
            'device_model' => $v->deviceModel?->name,
            'color_name' => $v->color_name,
            'color_hex' => $v->color_hex,
            'price' => $this->money($v->price),
            'compare_at_price' => $v->isBundle() ? $v->componentsValue() : ($v->compare_at_price ? $this->money($v->compare_at_price) : null),
            'stock' => $stock,
            'in_stock' => $stock > 0,
            'low_stock' => $stock > 0 && $stock <= $v->low_stock_threshold,
            'components' => $v->isBundle() ? $v->components->map(fn ($c) => [
                'variant_id' => $c->id,
                'name' => $c->product->name,
                'slug' => $c->product->slug,
                'label' => $c->label(),
                'price' => $this->money($c->price),
                'quantity' => $c->pivot->quantity,
                'image' => ($c->product->media->firstWhere('color_name', $c->color_name) ?? $c->product->media->first())?->url,
            ])->values() : null,
        ];
    }

    /** @return array<int, string> */
    public function labels(Product $product): array
    {
        return array_values(array_filter([
            $product->is_limited_edition ? 'Limited Edition' : null,
            $product->is_handmade ? 'Handmade' : null,
            $product->is_new_arrival ? 'New' : null,
            $product->is_bestseller ? 'Best Seller' : null,
            $product->type === 'bundle' ? 'Matching Set' : null,
        ]));
    }

    private function money(float|string $v): string
    {
        return number_format((float) $v, 2, '.', '');
    }
}
