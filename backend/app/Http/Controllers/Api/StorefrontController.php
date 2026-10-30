<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use App\Models\DeviceModel;
use App\Models\Product;
use App\Models\StoreSetting;
use App\Services\ProductPresenter;
use Illuminate\Http\JsonResponse;

class StorefrontController extends Controller
{
    public function __construct(private ProductPresenter $presenter) {}

    /** Global store configuration used on every page (header, footer, WhatsApp, demo flag). */
    public function settings(): JsonResponse
    {
        $s = StoreSetting::allValues();
        $whatsapp = $s['whatsapp'] ?? [];

        return response()->json([
            'demo_mode' => config('noire.demo_mode'),
            'currency' => config('noire.currency'),
            'store' => $s['store'] ?? [],
            'announcement' => $s['homepage']['announcement'] ?? ['enabled' => false],
            'whatsapp' => [
                'enabled' => (bool) ($whatsapp['enabled'] ?? false),
                'number' => preg_replace('/\D+/', '', (string) ($whatsapp['number'] ?? '')) ?: null,
                'default_message' => $whatsapp['default_message'] ?? '',
                'templates' => $whatsapp['templates'] ?? [],
            ],
            'shipping' => [
                'free_threshold' => $s['shipping']['free_threshold'] ?? null,
                'countries' => $s['shipping']['countries'] ?? ['Lebanon'],
                'areas' => $s['shipping']['areas'] ?? [],
                'delivery_note' => $s['shipping']['delivery_note'] ?? null,
            ],
            'social' => $s['social'] ?? [],
            'pages' => collect($s['pages'] ?? [])->map(fn ($p, $slug) => ['slug' => $slug, 'title' => $p['title']])->values(),
            'device_models' => DeviceModel::active()->get(['id', 'name', 'short_name', 'slug', 'family']),
            'collections' => Collection::where('is_published', true)->orderBy('sort_order')->get()
                ->map(fn ($c) => ['name' => $c->name, 'slug' => $c->slug, 'tagline' => $c->tagline, 'image' => $c->image_url]),
        ]);
    }

    public function home(): JsonResponse
    {
        $home = StoreSetting::read('homepage', []);
        $cards = fn ($query, $limit = 8) => $query->with(ProductPresenter::CARD_RELATIONS)->whereHas('activeVariants')
            ->orderBy('sort_order')->orderBy('id')->limit($limit)->get()->map(fn ($p) => $this->presenter->card($p))->values();

        $lookSlug = $home['complete_the_look']['bundle_slug'] ?? null;
        $look = Product::published()->where('type', 'bundle')
            ->when($lookSlug, fn ($q) => $q->where('slug', $lookSlug))->first()
            ?? Product::published()->where('type', 'bundle')->first();

        $featuredIds = $home['featured_product_ids'] ?? [];

        return response()->json([
            'hero' => $home['hero'] ?? [],
            'sections' => $home['sections'] ?? [],
            'handmade_story' => $home['handmade_story'] ?? [],
            'complete_the_look' => [
                ...($home['complete_the_look'] ?? []),
                'bundle' => $look ? $this->presenter->detail($look) : null,
            ],
            'collections' => Collection::where('is_published', true)->withCount(['products' => fn ($q) => $q->published()])
                ->orderBy('sort_order')->get()
                ->map(fn ($c) => ['name' => $c->name, 'slug' => $c->slug, 'tagline' => $c->tagline, 'description' => $c->description, 'image' => $c->image_url, 'count' => $c->products_count]),
            'bestsellers' => $cards(Product::published()->where('is_bestseller', true)),
            'new_arrivals' => $cards(Product::published()->where('is_new_arrival', true)->reorder()->orderByDesc('published_at')),
            'featured' => $featuredIds
                ? $cards(Product::published()->whereIn('id', $featuredIds))
                : $cards(Product::published()->where('is_featured', true)),
            'handmade' => $cards(Product::published()->where('is_handmade', true)->where('type', 'case'), 4),
        ]);
    }

    public function page(string $slug): JsonResponse
    {
        $page = StoreSetting::read('pages', [])[$slug] ?? abort(404);

        return response()->json(['slug' => $slug, ...$page]);
    }
}
