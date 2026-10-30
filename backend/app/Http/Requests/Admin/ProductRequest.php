<?php

namespace App\Http\Requests\Admin;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['slug' => Str::slug($this->input('slug') ?: $this->input('name', ''))]);
    }

    public function rules(): array
    {
        $id = $this->route('product')?->id;

        return [
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['required', 'string', 'max:140', Rule::unique('products', 'slug')->ignore($id)],
            'type' => ['required', Rule::in(Product::TYPES)],
            'status' => ['required', Rule::in(Product::STATUSES)],
            'short_description' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string', 'max:5000'],
            'material' => ['nullable', 'string', 'max:120'],
            'care_instructions' => ['nullable', 'string', 'max:1000'],
            'specs' => ['nullable', 'array', 'max:12'],
            'specs.*' => ['nullable', 'string', 'max:200'],
            'video_url' => ['nullable', 'url:https', 'max:255'],
            'is_featured' => ['boolean'],
            'is_bestseller' => ['boolean'],
            'is_new_arrival' => ['boolean'],
            'is_handmade' => ['boolean'],
            'is_limited_edition' => ['boolean'],
            'is_customizable' => ['boolean'],
            'production_days_min' => ['nullable', 'integer', 'min:1', 'max:90'],
            'production_days_max' => ['nullable', 'integer', 'min:1', 'max:90', 'gte:production_days_min'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'seo_title' => ['nullable', 'string', 'max:160'],
            'seo_description' => ['nullable', 'string', 'max:320'],
            'collection_ids' => ['array'],
            'collection_ids.*' => ['integer', 'exists:collections,id'],
            'matching_ids' => ['array'],
            'matching_ids.*' => ['integer', 'exists:products,id'],
        ];
    }

    public function messages(): array
    {
        return ['slug.unique' => 'Another product already uses this URL slug.'];
    }
}
