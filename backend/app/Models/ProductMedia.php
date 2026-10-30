<?php

namespace App\Models;

use App\Support\Media;
use Illuminate\Database\Eloquent\Model;

class ProductMedia extends Model
{
    protected $fillable = ['product_id', 'color_name', 'type', 'path', 'alt', 'width', 'height', 'sort_order', 'is_primary'];

    protected $casts = ['is_primary' => 'boolean'];

    protected $appends = ['url'];

    public function getUrlAttribute(): ?string
    {
        return Media::url($this->path);
    }
}
