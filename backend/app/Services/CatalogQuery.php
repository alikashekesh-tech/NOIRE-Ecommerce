<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/** Storefront product filtering and sorting, driven by URL query params. */
class CatalogQuery
{
    public const SORTS = ['featured', 'newest', 'price_asc', 'price_desc', 'name'];

    public function build(Request $request): Builder
    {
        $query = Product::published()->with(ProductPresenter::CARD_RELATIONS)->whereHas('activeVariants');

        $variantFilter = function (Builder $v) use ($request) {
            $v->where('is_active', true);
            if ($model = $request->query('model')) {
                $v->whereHas('deviceModel', fn ($d) => $d->where('slug', $model)->where('is_active', true));
            }
            if ($colors = $this->list($request->query('color'))) {
                $v->whereIn('color_name', $colors);
            }
            if (is_numeric($request->query('min_price'))) {
                $v->where('price', '>=', (float) $request->query('min_price'));
            }
            if (is_numeric($request->query('max_price'))) {
                $v->where('price', '<=', (float) $request->query('max_price'));
            }
            if ($request->boolean('in_stock')) {
                $v->where(fn ($s) => $s->where('stock', '>', 0)
                    ->orWhereHas('components', fn ($c) => $c->where('stock', '>', 0)));
            }
        };
        $query->whereHas('variants', $variantFilter);

        if ($q = trim((string) $request->query('q'))) {
            $query->where(fn ($w) => $w->where('name', 'like', "%{$q}%")
                ->orWhere('short_description', 'like', "%{$q}%")
                ->orWhere('material', 'like', "%{$q}%")
                ->orWhereHas('variants', fn ($v) => $v->where('color_name', 'like', "%{$q}%")->orWhere('sku', 'like', "%{$q}%")));
        }
        if ($collection = $request->query('collection')) {
            $query->whereHas('collections', fn ($c) => $c->where('slug', $collection)->where('is_published', true));
        }
        if ($types = $this->list($request->query('type'))) {
            $query->whereIn('type', $types);
        }
        if ($materials = $this->list($request->query('material'))) {
            $query->whereIn('material', $materials);
        }
        foreach (['handmade' => 'is_handmade', 'new' => 'is_new_arrival', 'featured' => 'is_featured', 'bestseller' => 'is_bestseller', 'limited' => 'is_limited_edition'] as $param => $column) {
            if ($request->boolean($param)) {
                $query->where($column, true);
            }
        }
        if ($request->boolean('matching')) {
            $query->where(fn ($w) => $w->where('type', 'bundle')->orWhereHas('matching'));
        }
        if ($ids = $this->list($request->query('ids'))) {
            $query->whereIn('id', array_map('intval', $ids));
        }

        $minPrice = ProductVariant::selectRaw('MIN(price)')->whereColumn('product_id', 'products.id')->where('is_active', true);

        match ($request->query('sort', 'featured')) {
            'newest' => $query->orderByDesc('published_at')->orderByDesc('id'),
            'price_asc' => $query->orderBy($minPrice),
            'price_desc' => $query->orderByDesc($minPrice),
            'name' => $query->orderBy('name'),
            default => $query->orderByDesc('is_featured')->orderBy('sort_order')->orderBy('id'),
        };

        return $query;
    }

    /** Filter options shown in the storefront sidebar. */
    public function facets(): array
    {
        $variants = ProductVariant::query()->where('is_active', true)
            ->whereHas('product', fn ($p) => $p->published());

        return [
            'colors' => (clone $variants)->select('color_name', 'color_hex')->distinct()->orderBy('color_name')->get()
                ->unique('color_name')->map(fn ($v) => ['name' => $v->color_name, 'hex' => $v->color_hex])->values(),
            'materials' => Product::published()->whereNotNull('material')->distinct()->orderBy('material')->pluck('material'),
            'price' => [
                'min' => (float) (clone $variants)->min('price'),
                'max' => (float) (clone $variants)->max('price'),
            ],
            'types' => [
                ['value' => 'case', 'label' => 'Phone Cases'],
                ['value' => 'power_bank', 'label' => 'Power Banks'],
                ['value' => 'bundle', 'label' => 'Matching Sets'],
            ],
        ];
    }

    /** @return array<int, string> */
    private function list(mixed $value): array
    {
        if (is_array($value)) {
            return array_values(array_filter(array_map('strval', $value)));
        }

        return $value === null || $value === '' ? [] : array_values(array_filter(explode(',', (string) $value)));
    }
}
