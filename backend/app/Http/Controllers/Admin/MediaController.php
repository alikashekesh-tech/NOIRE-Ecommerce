<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductMedia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class MediaController extends Controller
{
    public function store(Request $request, Product $product): JsonResponse
    {
        $request->validate([
            'images' => ['required_without:video_url', 'array', 'max:10'],
            'images.*' => ['file', 'mimes:jpg,jpeg,png,webp', 'mimetypes:image/jpeg,image/png,image/webp', 'max:8192', 'dimensions:min_width=400,min_height=400,max_width=8000,max_height=8000'],
            'video_url' => ['nullable', 'url:https', 'max:255'],
            'color_name' => ['nullable', 'string', 'max:60'],
            'alt' => ['nullable', 'string', 'max:200'],
        ], [
            'images.*.dimensions' => 'Images must be at least 400×400px (1200×1500px recommended).',
            'images.*.mimes' => 'Upload JPG, PNG or WebP images.',
        ]);

        $sort = (int) $product->media()->max('sort_order') + 1;
        $hasPrimary = $product->media()->where('is_primary', true)->exists();
        $created = [];

        foreach ($request->file('images', []) as $file) {
            [$w, $h] = getimagesize($file->getRealPath()) ?: [null, null];
            $path = $file->store("products/{$product->id}", 'public'); // random hashed filename
            $created[] = $product->media()->create([
                'type' => 'image', 'path' => $path, 'alt' => $request->input('alt') ?: $product->name,
                'color_name' => $request->input('color_name') ?: null, 'width' => $w, 'height' => $h,
                'sort_order' => $sort++, 'is_primary' => ! $hasPrimary && ! $created,
            ]);
        }
        if ($url = $request->input('video_url')) {
            $created[] = $product->media()->create(['type' => 'video', 'path' => $url, 'alt' => $request->input('alt') ?: $product->name, 'sort_order' => $sort++]);
        }

        return response()->json($created, 201);
    }

    public function update(Request $request, ProductMedia $media): JsonResponse
    {
        $data = $request->validate([
            'alt' => ['nullable', 'string', 'max:200'],
            'color_name' => ['nullable', 'string', 'max:60'],
            'is_primary' => ['boolean'],
        ]);
        DB::transaction(function () use ($media, $data) {
            if (! empty($data['is_primary'])) {
                ProductMedia::where('product_id', $media->product_id)->update(['is_primary' => false]);
            }
            $media->update($data);
        });

        return response()->json($media->refresh());
    }

    public function reorder(Request $request, Product $product): JsonResponse
    {
        $ids = $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']])['ids'];
        DB::transaction(function () use ($ids, $product) {
            foreach ($ids as $i => $id) {
                ProductMedia::where('product_id', $product->id)->whereKey($id)->update(['sort_order' => $i]);
            }
        });

        return response()->json($product->media()->get());
    }

    public function destroy(ProductMedia $media): JsonResponse
    {
        $shared = ProductMedia::where('path', $media->path)->where('id', '!=', $media->id)->exists(); // duplicated products share files
        if ($media->type === 'image' && ! $shared) {
            Storage::disk('public')->delete($media->path);
        }
        $wasPrimary = $media->is_primary;
        $productId = $media->product_id;
        $media->delete();
        if ($wasPrimary) {
            ProductMedia::where('product_id', $productId)->orderBy('sort_order')->first()?->update(['is_primary' => true]);
        }

        return response()->json(['message' => 'Media removed']);
    }
}
