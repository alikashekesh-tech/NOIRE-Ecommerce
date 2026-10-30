<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use SoftDeletes;

    public const TYPES = ['case', 'power_bank', 'bundle'];

    public const STATUSES = ['draft', 'published', 'archived'];

    protected $fillable = [
        'name', 'slug', 'type', 'status', 'short_description', 'description', 'material', 'care_instructions',
        'specs', 'video_url', 'is_featured', 'is_bestseller', 'is_new_arrival', 'is_handmade', 'is_limited_edition',
        'is_customizable', 'production_days_min', 'production_days_max', 'sort_order', 'seo_title', 'seo_description',
        'published_at',
    ];

    protected $casts = [
        'specs' => 'array',
        'is_featured' => 'boolean',
        'is_bestseller' => 'boolean',
        'is_new_arrival' => 'boolean',
        'is_handmade' => 'boolean',
        'is_limited_edition' => 'boolean',
        'is_customizable' => 'boolean',
        'published_at' => 'datetime',
    ];

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    public function collections()
    {
        return $this->belongsToMany(Collection::class)->withPivot('sort_order');
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class)->orderBy('sort_order')->orderBy('id');
    }

    public function activeVariants()
    {
        return $this->variants()->where('is_active', true);
    }

    public function media()
    {
        return $this->hasMany(ProductMedia::class)->orderByDesc('is_primary')->orderBy('sort_order')->orderBy('id');
    }

    public function matching()
    {
        return $this->belongsToMany(Product::class, 'product_relations', 'product_id', 'related_product_id')
            ->withPivotValue('type', 'matching')->withPivot('sort_order');
    }

    public function primaryImageUrl(): ?string
    {
        $media = $this->relationLoaded('media') ? $this->media : $this->media()->get();

        return $media->firstWhere('type', 'image')?->url;
    }
}
