<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/** Key/value store settings (homepage content, WhatsApp, shipping, store info). */
class StoreSetting extends Model
{
    protected $fillable = ['key', 'value'];

    protected $casts = ['value' => 'array'];

    public static function read(string $key, mixed $default = null): mixed
    {
        return static::allValues()[$key] ?? $default;
    }

    public static function write(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
        Cache::forget('store_settings');
    }

    /** @return array<string, mixed> */
    public static function allValues(): array
    {
        return Cache::rememberForever('store_settings', fn () => static::query()->get()->pluck('value', 'key')->all());
    }
}
