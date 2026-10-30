<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id', 'device_model_id', 'sku', 'color_name', 'color_hex', 'combination_key', 'price',
        'compare_at_price', 'stock', 'low_stock_threshold', 'is_active', 'sort_order',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'compare_at_price' => 'decimal:2',
        'stock' => 'integer',
        'low_stock_threshold' => 'integer',
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saving(function (ProductVariant $variant) {
            $variant->combination_key = self::combinationKey($variant->device_model_id, $variant->color_name);
        });
    }

    public static function combinationKey(?int $deviceModelId, string $color): string
    {
        return ($deviceModelId ?? 'any').'|'.mb_strtolower(trim($color));
    }

    public function product()
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    public function deviceModel()
    {
        return $this->belongsTo(DeviceModel::class);
    }

    /** For bundle variants: the component variants that make up the set. */
    public function components()
    {
        return $this->belongsToMany(ProductVariant::class, 'bundle_items', 'bundle_variant_id', 'component_variant_id')
            ->withPivot('quantity');
    }

    public function isBundle(): bool
    {
        return $this->product?->type === 'bundle';
    }

    /** Sellable units: bundles derive availability from their components. */
    public function availableStock(): int
    {
        if (! $this->isBundle()) {
            return $this->stock;
        }
        $components = $this->relationLoaded('components') ? $this->components : $this->components()->get();
        if ($components->isEmpty()) {
            return 0;
        }

        return (int) $components->map(fn ($c) => $c->is_active ? intdiv($c->stock, max(1, $c->pivot->quantity)) : 0)->min();
    }

    /** Sum of component prices, used to show bundle savings. */
    public function componentsValue(): ?string
    {
        if (! $this->isBundle()) {
            return null;
        }
        $components = $this->relationLoaded('components') ? $this->components : $this->components()->get();

        return number_format($components->sum(fn ($c) => (float) $c->price * $c->pivot->quantity), 2, '.', '');
    }

    public function label(): string
    {
        return collect([$this->deviceModel?->name, $this->color_name])->filter()->implode(' · ');
    }
}
