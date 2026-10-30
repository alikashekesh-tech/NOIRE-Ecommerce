<?php

namespace App\Http\Requests\Admin;

use App\Models\ProductVariant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class VariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['sku' => strtoupper(trim((string) $this->input('sku')))]);
    }

    public function rules(): array
    {
        $variant = $this->route('variant');

        return [
            'device_model_id' => ['nullable', 'integer', 'exists:device_models,id'],
            'color_name' => ['required', 'string', 'max:60'],
            'color_hex' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'sku' => ['required', 'string', 'max:64', 'regex:/^[A-Z0-9\-_.]+$/', Rule::unique('product_variants', 'sku')->ignore($variant?->id)],
            'price' => ['required', 'decimal:0,2', 'min:0', 'max:99999'],
            'compare_at_price' => ['nullable', 'decimal:0,2', 'gt:price', 'max:99999'],
            'stock' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            $variant = $this->route('variant');
            $productId = $variant?->product_id ?? $this->route('product')?->id;
            $key = ProductVariant::combinationKey($this->input('device_model_id') ? (int) $this->input('device_model_id') : null, (string) $this->input('color_name'));
            $exists = ProductVariant::where('product_id', $productId)->where('combination_key', $key)
                ->when($variant, fn ($q) => $q->where('id', '!=', $variant->id))->exists();
            if ($exists) {
                $validator->errors()->add('color_name', 'This product already has a variant for that device model and colour.');
            }
        }];
    }

    public function messages(): array
    {
        return [
            'sku.unique' => 'This SKU is already used by another variant.',
            'sku.regex' => 'SKUs may contain letters, numbers, dashes, dots and underscores.',
            'compare_at_price.gt' => 'The compare-at price must be higher than the selling price.',
        ];
    }
}
