<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProductRequest;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::query()->with(['media', 'collections:id,name', 'variants.components'])
            ->when($request->query('q'), fn ($q, $s) => $q->where(fn ($w) => $w->where('name', 'like', "%{$s}%")->orWhereHas('variants', fn ($v) => $v->where('sku', 'like', "%{$s}%"))))
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('type'), fn ($q, $t) => $q->where('type', $t))
            ->when($request->query('collection'), fn ($q, $c) => $q->whereHas('collections', fn ($w) => $w->where('collections.id', $c)))
            ->when($request->boolean('trashed'), fn ($q) => $q->onlyTrashed())
            ->latest('updated_at');

        $page = $query->paginate(20)->withQueryString();

        return response()->json([
            'data' => collect($page->items())->map(fn (Product $p) => [
                'id' => $p->id, 'name' => $p->name, 'slug' => $p->slug, 'type' => $p->type, 'status' => $p->status,
                'image' => $p->primaryImageUrl(),
                'collections' => $p->collections->pluck('name'),
                'variant_count' => $p->variants->count(),
                'stock' => $p->type === 'bundle' ? $p->variants->sum(fn ($v) => $v->availableStock()) : $p->variants->sum('stock'),
                'price_min' => $p->variants->min('price'), 'price_max' => $p->variants->max('price'),
                'is_featured' => $p->is_featured, 'is_handmade' => $p->is_handmade, 'is_new_arrival' => $p->is_new_arrival,
                'updated_at' => $p->updated_at,
            ]),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    public function show(Product $product): JsonResponse
    {
        $product->load(['media', 'collections:id', 'matching:id', 'variants.deviceModel', 'variants.components.product:id,name', 'variants.components.deviceModel']);

        return response()->json([
            ...$product->toArray(),
            'collection_ids' => $product->collections->pluck('id'),
            'matching_ids' => $product->matching->pluck('id'),
            'variants' => $product->variants->map(fn (ProductVariant $v) => [
                ...$v->only(['id', 'sku', 'device_model_id', 'color_name', 'color_hex', 'price', 'compare_at_price', 'stock', 'low_stock_threshold', 'is_active', 'sort_order']),
                'device_model' => $v->deviceModel?->name,
                'available' => $v->availableStock(),
                'components' => $v->components->map(fn ($c) => ['variant_id' => $c->id, 'sku' => $c->sku, 'name' => $c->product->name, 'label' => $c->label(), 'stock' => $c->stock, 'price' => $c->price, 'quantity' => $c->pivot->quantity]),
            ]),
            'media' => $product->media,
            'storefront_url' => '/products/'.$product->slug,
        ]);
    }

    public function store(ProductRequest $request): JsonResponse
    {
        $product = DB::transaction(function () use ($request) {
            $product = Product::create($this->attributes($request));
            $this->syncRelations($product, $request);

            return $product;
        });

        return $this->show($product)->setStatusCode(201);
    }

    public function update(ProductRequest $request, Product $product): JsonResponse
    {
        DB::transaction(function () use ($request, $product) {
            $product->update($this->attributes($request, $product));
            $this->syncRelations($product, $request);
        });

        return $this->show($product->refresh());
    }

    /** Soft delete: order history keeps its snapshots; the product leaves the storefront. */
    public function destroy(Product $product): JsonResponse
    {
        $product->update(['status' => 'archived']);
        $product->delete();

        return response()->json(['message' => 'Product removed']);
    }

    public function duplicate(Product $product): JsonResponse
    {
        $copy = DB::transaction(function () use ($product) {
            $copy = $product->replicate(['slug', 'published_at']);
            $copy->name = $product->name.' (Copy)';
            $copy->slug = Str::slug($copy->name).'-'.Str::lower(Str::random(4));
            $copy->status = 'draft';
            $copy->save();
            $copy->collections()->sync($product->collections->pluck('id'));
            $suffix = '-C'.strtoupper(Str::random(3));
            foreach ($product->variants as $v) {
                $nv = $v->replicate(['combination_key']);
                $nv->product_id = $copy->id;
                $nv->sku = mb_substr($v->sku, 0, 58).$suffix;
                $nv->stock = 0;
                $nv->save();
                if ($product->type === 'bundle') {
                    $nv->components()->sync($v->components->mapWithKeys(fn ($c) => [$c->id => ['quantity' => $c->pivot->quantity]]));
                }
            }
            foreach ($product->media as $m) {
                ProductMedia::create([...$m->only(['color_name', 'type', 'path', 'alt', 'width', 'height', 'sort_order', 'is_primary']), 'product_id' => $copy->id]);
            }

            return $copy;
        });

        return $this->show($copy)->setStatusCode(201);
    }

    private function attributes(ProductRequest $request, ?Product $product = null): array
    {
        $data = collect($request->validated())->except(['collection_ids', 'matching_ids'])->all();
        $data['specs'] = collect($data['specs'] ?? [])->filter(fn ($v, $k) => filled($k) && filled($v))->all();
        if (($data['status'] ?? null) === 'published' && ! $product?->published_at) {
            $data['published_at'] = now();
        }

        return $data;
    }

    private function syncRelations(Product $product, ProductRequest $request): void
    {
        if ($request->has('collection_ids')) {
            $product->collections()->sync($request->validated('collection_ids'));
        }
        if ($request->has('matching_ids')) {
            $ids = collect($request->validated('matching_ids'))->reject(fn ($id) => $id === $product->id);
            $product->matching()->sync($ids->mapWithKeys(fn ($id) => [$id => ['type' => 'matching']])->all());
        }
    }
}
