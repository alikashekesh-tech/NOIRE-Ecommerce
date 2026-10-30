<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    /** Linear fulfilment flow; "cancelled" is a separate terminal state. */
    public const FLOW = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

    public const STATUSES = [...self::FLOW, 'cancelled'];

    public const PAYMENT_METHODS = ['demo_cod' => 'Demo Cash on Delivery', 'demo_card' => 'Simulated Card Payment'];

    protected $guarded = ['id'];

    protected $hidden = ['access_token'];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'shipping_total' => 'decimal:2',
        'total' => 'decimal:2',
        'refunded_amount' => 'decimal:2',
        'is_demo' => 'boolean',
        'placed_at' => 'datetime',
        'inventory_restored_at' => 'datetime',
    ];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function history()
    {
        return $this->hasMany(OrderStatusHistory::class)->latest('id');
    }

    /** Reporting definition: cancelled orders are excluded from revenue. */
    public function scopeCountable($query)
    {
        return $query->where('status', '!=', 'cancelled');
    }

    public function getCustomerNameAttribute(): string
    {
        return trim($this->first_name.' '.$this->last_name);
    }

    public function getPaymentMethodLabelAttribute(): string
    {
        return self::PAYMENT_METHODS[$this->payment_method] ?? $this->payment_method;
    }
}
