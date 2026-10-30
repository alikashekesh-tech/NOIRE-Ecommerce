<?php

namespace App\Models;

use App\Support\Media;
use Illuminate\Database\Eloquent\Model;

class Collection extends Model
{
    protected $fillable = ['name', 'slug', 'tagline', 'description', 'image_path', 'sort_order', 'is_published', 'seo_title', 'seo_description'];

    protected $casts = ['is_published' => 'boolean'];

    public function products()
    {
        return $this->belongsToMany(Product::class)->withPivot('sort_order');
    }

    public function getImageUrlAttribute(): ?string
    {
        return Media::url($this->image_path);
    }
}
