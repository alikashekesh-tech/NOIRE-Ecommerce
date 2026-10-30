<?php

namespace Tests\Feature;

use App\Models\DeviceModel;
use App\Models\Product;
use Tests\TestCase;

class CatalogTest extends TestCase
{
    public function test_storefront_settings_and_home_load(): void
    {
        $this->getJson('/api/v1/storefront/settings')
            ->assertOk()
            ->assertJsonPath('demo_mode', true)
            ->assertJsonCount(6, 'device_models')
            ->assertJsonPath('whatsapp.number', null); // never invented

        $this->getJson('/api/v1/storefront/home')
            ->assertOk()
            ->assertJsonStructure(['hero' => ['title'], 'collections', 'bestsellers', 'new_arrivals', 'complete_the_look' => ['bundle' => ['variants']]]);
    }

    public function test_product_listing_only_shows_published_products(): void
    {
        $draft = Product::where('type', 'case')->first();
        $draft->update(['status' => 'draft']);

        $res = $this->getJson('/api/v1/products?per_page=60')->assertOk();
        $this->assertNotContains($draft->id, collect($res->json('data'))->pluck('id'));
        $this->assertSame(Product::published()->count(), $res->json('meta.total'));
        $this->getJson("/api/v1/products/{$draft->slug}")->assertNotFound();
    }

    public function test_model_filter_returns_only_compatible_products(): void
    {
        $model = DeviceModel::where('slug', 'iphone-17')->first();
        $res = $this->getJson('/api/v1/products?model=iphone-17&per_page=60')->assertOk();

        $this->assertGreaterThan(0, $res->json('meta.total'));
        foreach ($res->json('data') as $card) {
            $this->assertTrue(
                Product::find($card['id'])->variants()->where('device_model_id', $model->id)->where('is_active', true)->exists(),
                "{$card['name']} is not configured for iPhone 17",
            );
        }
        // Power banks have no model-specific variants, so they are not claimed as compatible.
        $this->assertNotContains('power_bank', collect($res->json('data'))->pluck('type'));
    }

    public function test_filters_combine_and_sort(): void
    {
        $res = $this->getJson('/api/v1/products?handmade=1&color=Ivory&sort=price_asc&per_page=60')->assertOk();
        $prices = collect($res->json('data'))->pluck('price')->map(fn ($p) => (float) $p);
        $this->assertNotEmpty($prices);
        $this->assertSame($prices->sort()->values()->all(), $prices->all());
        foreach ($res->json('data') as $card) {
            $this->assertContains('Handmade', $card['labels']);
            $this->assertContains('Ivory', collect($card['colors'])->pluck('name'));
        }
    }

    public function test_search_finds_products(): void
    {
        $this->getJson('/api/v1/products?q=Pearl')->assertOk()->assertJsonFragment(['name' => 'Pearl Reverie']);
    }

    public function test_product_detail_exposes_variants_and_matching_items(): void
    {
        $res = $this->getJson('/api/v1/products/quilted-atelier')->assertOk();
        $this->assertCount(8, $res->json('variants')); // 2 colours × 4 Pro models
        $this->assertNotEmpty($res->json('matching'));
        $this->assertContains('bundle', collect($res->json('matching'))->pluck('type'));
        foreach ($res->json('variants') as $v) {
            $this->assertMatchesRegularExpression('/^\d+\.\d{2}$/', $v['price']);
        }
    }

    public function test_bundle_variants_report_component_based_availability(): void
    {
        $res = $this->getJson('/api/v1/products/the-matching-edit-signature')->assertOk();
        $variant = $res->json('variants.0');
        $this->assertCount(2, $variant['components']);
        $this->assertGreaterThan((float) $variant['price'], (float) $variant['compare_at_price']);
    }
}
