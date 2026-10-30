<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'line_total' => 'decimal:2',
        'customization' => 'array',
        'components' => 'array',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
