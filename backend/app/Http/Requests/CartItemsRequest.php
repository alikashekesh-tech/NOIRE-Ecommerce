<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CartItemsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => ['present', 'array', 'max:30'],
            'items.*.variant_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:'.config('noire.max_line_quantity')],
            'items.*.customization' => ['nullable', 'array'],
            'items.*.customization.text' => ['nullable', 'string', 'max:20'],
            'items.*.customization.colors' => ['nullable', 'string', 'max:60'],
            'items.*.customization.instructions' => ['nullable', 'string', 'max:300'],
            'shipping_method' => ['nullable', 'string', 'max:40'],
        ];
    }
}
