<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderStatusHistory extends Model
{
    protected $fillable = ['order_id', 'from_status', 'to_status', 'note', 'user_id'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
