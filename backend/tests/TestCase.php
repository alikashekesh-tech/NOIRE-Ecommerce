<?php

namespace Tests;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Storage;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    /** Seed the demo catalogue (settings + products) into the isolated test database. */
    protected bool $seed = true;

    /** Keep seeded demo art out of the real public disk. */
    protected function beforeRefreshingDatabase()
    {
        Storage::fake('public');
        Storage::fake('local');
    }

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::fake('local');
    }

    protected function admin(): User
    {
        return User::where('role', 'admin')->firstOrFail();
    }

    protected function customer(): User
    {
        return User::factory()->create(['role' => 'customer']);
    }

    /** A sellable single (non-bundle) variant with at least $min units. */
    protected function stockedVariant(int $min = 3): ProductVariant
    {
        return ProductVariant::whereHas('product', fn ($p) => $p->published()->where('type', 'case'))
            ->where('is_active', true)->where('stock', '>=', $min)->orderBy('id')->firstOrFail();
    }

    protected function bundleVariant(): ProductVariant
    {
        return ProductVariant::whereHas('product', fn ($p) => $p->published()->where('type', 'bundle'))
            ->with('components')->get()->first(fn ($v) => $v->availableStock() >= 2);
    }

    protected function checkoutPayload(array $items, array $overrides = []): array
    {
        return [
            'items' => $items,
            'first_name' => 'Test', 'last_name' => 'Customer', 'email' => 'test.customer@example.com', 'phone' => '+961 70 000 000',
            'country' => 'Lebanon', 'city' => 'Beirut', 'address_line1' => 'Demo Street 1',
            'shipping_method' => 'standard', 'payment_method' => 'demo_cod',
            ...$overrides,
        ];
    }

    protected function product(string $slug): Product
    {
        return Product::where('slug', $slug)->firstOrFail();
    }
}
