<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomRequest extends Model
{
    public const STATUSES = ['new', 'reviewing', 'quoted', 'approved', 'rejected', 'completed'];

    protected $guarded = ['id'];

    protected $casts = ['quoted_price' => 'decimal:2'];

    public function product()
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    public function deviceModel()
    {
        return $this->belongsTo(DeviceModel::class);
    }
}
