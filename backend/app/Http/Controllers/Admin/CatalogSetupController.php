<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use App\Models\DeviceModel;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/** Collections, device models and the variant picker used for matching sets. */
class CatalogSetupController extends Controller
{
    public function collections(): JsonResponse
    {
        return response()->json(Collection::withCount('products')->orderBy('sort_order')->get()->map(fn ($c) => [...$c->toArray(), 'image_url' => $c->image_url]));
    }

    public function storeCollection(Request $request): JsonResponse
    {
        return $this->saveCollection($request, new Collection);
    }

    public function updateCollection(Request $request, Collection $collection): JsonResponse
    {
        return $this->saveCollection($request, $collection);
    }

    private function saveCollection(Request $request, Collection $collection): JsonResponse
    {
        $request->merge(['slug' => Str::slug($request->input('slug') ?: $request->input('name', ''))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'slug' => ['required', 'string', 'max:100', Rule::unique('collections', 'slug')->ignore($collection->id)],
            'tagline' => ['nullable', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:1000'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_published' => ['boolean'],
            'image' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:8192', 'dimensions:min_width=600,min_height=600'],
        ]);
        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('collections', 'public');
        }
        unset($data['image']);
        $collection->fill($data)->save();

        return response()->json([...$collection->toArray(), 'image_url' => $collection->image_url], $collection->wasRecentlyCreated ? 201 : 200);
    }

    public function deviceModels(): JsonResponse
    {
        return response()->json(DeviceModel::orderBy('sort_order')->get());
    }

    public function storeDeviceModel(Request $request): JsonResponse
    {
        return response()->json(DeviceModel::create($this->deviceData($request)), 201);
    }

    public function updateDeviceModel(Request $request, DeviceModel $deviceModel): JsonResponse
    {
        $deviceModel->update($this->deviceData($request, $deviceModel));

        return response()->json($deviceModel);
    }

    private function deviceData(Request $request, ?DeviceModel $model = null): array
    {
        $request->merge(['slug' => Str::slug($request->input('slug') ?: $request->input('name', ''))]);

        return $request->validate([
            'name' => ['required', 'string', 'max:60'],
            'short_name' => ['required', 'string', 'max:40'],
            'slug' => ['required', 'string', 'max:60', Rule::unique('device_models', 'slug')->ignore($model?->id)],
            'family' => ['required', 'string', 'max:40'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);
    }

    public function variantSearch(Request $request): JsonResponse
    {
        $s = (string) $request->query('q');
        $variants = ProductVariant::with(['product:id,name,type', 'deviceModel:id,name'])
            ->whereHas('product', fn ($p) => $p->where('type', '!=', 'bundle'))
            ->where(fn ($w) => $w->where('sku', 'like', "%{$s}%")->orWhereHas('product', fn ($p) => $p->where('name', 'like', "%{$s}%")))
            ->limit(25)->get();

        return response()->json($variants->map(fn ($v) => ['id' => $v->id, 'sku' => $v->sku, 'name' => $v->product->name, 'label' => $v->label(), 'stock' => $v->stock, 'price' => $v->price]));
    }
}
