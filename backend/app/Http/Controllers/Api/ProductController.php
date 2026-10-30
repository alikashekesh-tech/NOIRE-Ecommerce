<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\CatalogQuery;
use App\Services\ProductPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function __construct(private ProductPresenter $presenter, private CatalogQuery $catalog) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'sort' => ['nullable', 'in:'.implode(',', CatalogQuery::SORTS)],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:60'],
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        $page = $this->catalog->build($request)->paginate($request->integer('per_page', 24))->withQueryString();

        return response()->json([
            'data' => collect($page->items())->map(fn ($p) => $this->presenter->card($p))->values(),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()],
            'facets' => $request->boolean('facets') ? $this->catalog->facets() : null,
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $product = Product::published()->where('slug', $slug)->firstOrFail();
        $detail = $this->presenter->detail($product);
        $load = fn ($q) => $q->published()->with(ProductPresenter::CARD_RELATIONS)->whereHas('activeVariants');

        // Matching accessories: explicit relations, plus any bundle that contains this product.
        $matching = $product->matching()->tap($load)->get();
        $variantIds = $product->variants()->pluck('id');
        $bundles = Product::where('type', 'bundle')->tap($load)
            ->whereHas('variants.components', fn ($c) => $c->whereIn('product_variants.id', $variantIds))->get();

        $related = Product::where('id', '!=', $product->id)->tap($load)
            ->whereHas('collections', fn ($c) => $c->whereIn('collections.id', $product->collections->pluck('id')))
            ->whereNotIn('id', $matching->pluck('id')->merge($bundles->pluck('id')))
            ->orderByDesc('is_featured')->limit(8)->get();

        return response()->json([
            ...$detail,
            'matching' => $matching->merge($bundles)->unique('id')->map(fn ($p) => $this->presenter->card($p))->values(),
            'related' => $related->map(fn ($p) => $this->presenter->card($p))->values(),
        ]);
    }

    public function collection(string $slug): JsonResponse
    {
        $c = Collection::where('slug', $slug)->where('is_published', true)->firstOrFail();

        return response()->json([
            'name' => $c->name, 'slug' => $c->slug, 'tagline' => $c->tagline, 'description' => $c->description,
            'image' => $c->image_url, 'seo_title' => $c->seo_title, 'seo_description' => $c->seo_description,
        ]);
    }

    /** Lightweight lookup used by the wishlist and recently viewed lists. */
    public function variants(Request $request): JsonResponse
    {
        $ids = array_slice(array_map('intval', explode(',', (string) $request->query('ids'))), 0, 50);
        $variants = ProductVariant::with(['product', 'deviceModel', 'components'])->whereIn('id', $ids)->get();

        return response()->json($variants->map(fn ($v) => $this->presenter->variant($v))->values());
    }
}
