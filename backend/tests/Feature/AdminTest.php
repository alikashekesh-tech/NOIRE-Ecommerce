<?php

namespace Tests\Feature;

use App\Models\Collection;
use App\Models\DeviceModel;
use App\Models\Order;
use App\Models\Product;
use App\Services\OrderService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminTest extends TestCase
{
    private array $spa = ['Origin' => 'http://localhost:5173', 'Referer' => 'http://localhost:5173/admin'];

    public function test_admin_can_log_in_and_customers_cannot(): void
    {
        $this->withHeaders($this->spa)->postJson('/api/v1/admin/login', ['email' => 'admin@noire.test', 'password' => 'wrong'])
            ->assertUnprocessable();
        $this->withHeaders($this->spa)->postJson('/api/v1/admin/login', ['email' => 'admin@noire.test', 'password' => 'test-password-123'])
            ->assertOk()->assertJsonPath('role', 'admin');
        $this->withHeaders($this->spa)->getJson('/api/v1/admin/me')->assertOk();

        $customer = $this->customer();
        $this->app['auth']->forgetGuards();
        $this->withHeaders($this->spa)->postJson('/api/v1/admin/login', ['email' => $customer->email, 'password' => 'password'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_admin_endpoints_reject_guests_and_customers(): void
    {
        $this->getJson('/api/v1/admin/dashboard')->assertUnauthorized();
        $this->getJson('/api/v1/admin/products')->assertUnauthorized();
        $this->actingAs($this->customer(), 'sanctum')->getJson('/api/v1/admin/dashboard')->assertForbidden();
        $this->actingAs($this->customer(), 'sanctum')->postJson('/api/v1/admin/products', [])->assertForbidden();
    }

    public function test_dashboard_reports_recorded_demo_values(): void
    {
        $orders = app(OrderService::class);
        $a = $orders->place($this->checkoutPayload([]), [['variant_id' => $this->stockedVariant()->id, 'quantity' => 1]]);
        $b = $orders->place($this->checkoutPayload([]), [['variant_id' => $this->stockedVariant()->id, 'quantity' => 1]]);
        $orders->transition($b, 'cancelled');

        $this->actingAs($this->admin(), 'sanctum')->getJson('/api/v1/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('totals.orders', 2)
            ->assertJsonPath('totals.revenue', number_format((float) $a->total, 2, '.', '')); // cancelled excluded
    }

    public function test_admin_creates_product_with_variants_and_it_appears_on_storefront(): void
    {
        $this->actingAs($this->admin(), 'sanctum');
        $collection = Collection::where('slug', 'signature-cases')->first();
        $model = DeviceModel::where('slug', 'iphone-17-pro')->first();

        $product = $this->postJson('/api/v1/admin/products', [
            'name' => 'Client Demo Case', 'type' => 'case', 'status' => 'draft', 'short_description' => 'Created in the admin test',
            'collection_ids' => [$collection->id], 'is_new_arrival' => true,
        ])->assertCreated()->assertJsonPath('slug', 'client-demo-case')->json();

        $this->postJson("/api/v1/admin/products/{$product['id']}/variants", [
            'device_model_id' => $model->id, 'color_name' => 'Ivory', 'color_hex' => '#EFE8DC', 'sku' => 'nr-test-17p-ivo', 'price' => '49.00', 'stock' => 7,
        ])->assertCreated()->assertJsonPath('sku', 'NR-TEST-17P-IVO');

        // Draft products stay hidden until published.
        $this->getJson('/api/v1/products/client-demo-case')->assertNotFound();
        $this->putJson("/api/v1/admin/products/{$product['id']}", [...$product, 'status' => 'published', 'collection_ids' => [$collection->id]])->assertOk();

        $this->getJson('/api/v1/products/client-demo-case')->assertOk()->assertJsonPath('variants.0.price', '49.00')->assertJsonPath('variants.0.stock', 7);
        $this->getJson('/api/v1/products?model=iphone-17-pro&q=Client')->assertOk()->assertJsonPath('meta.total', 1);
    }

    public function test_duplicate_variant_combinations_and_skus_are_rejected(): void
    {
        $this->actingAs($this->admin(), 'sanctum');
        $product = $this->product('noire-signature-case');
        $existing = $product->variants()->first();

        $this->postJson("/api/v1/admin/products/{$product->id}/variants", [
            'device_model_id' => $existing->device_model_id, 'color_name' => strtoupper($existing->color_name), 'color_hex' => '#000000', 'sku' => 'NR-NEW-UNIQUE', 'price' => '40',
        ])->assertUnprocessable()->assertJsonValidationErrors('color_name');

        $this->postJson("/api/v1/admin/products/{$product->id}/variants", [
            'device_model_id' => null, 'color_name' => 'Sky', 'color_hex' => '#AABBCC', 'sku' => $existing->sku, 'price' => '40',
        ])->assertUnprocessable()->assertJsonValidationErrors('sku');
    }

    public function test_variant_price_and_stock_updates_persist_and_are_logged(): void
    {
        $this->actingAs($this->admin(), 'sanctum');
        $v = $this->stockedVariant();
        $this->putJson("/api/v1/admin/variants/{$v->id}", [...$v->only(['device_model_id', 'color_name', 'color_hex', 'sku']), 'price' => '61.50', 'stock' => 42, 'is_active' => true])->assertOk();

        $this->assertSame('61.50', $v->refresh()->price);
        $this->assertSame(42, $v->stock);
        $this->assertDatabaseHas('inventory_movements', ['product_variant_id' => $v->id, 'stock_after' => 42, 'reason' => 'adjustment']);

        $this->postJson("/api/v1/admin/inventory/{$v->id}/adjust", ['mode' => 'change', 'value' => -50])->assertUnprocessable();
        $this->postJson("/api/v1/admin/inventory/{$v->id}/adjust", ['mode' => 'change', 'value' => -2])->assertOk()->assertJsonPath('stock', 40);
    }

    public function test_media_upload_validates_files(): void
    {
        $this->actingAs($this->admin(), 'sanctum');
        $product = $this->product('midnight-form');

        $this->post("/api/v1/admin/products/{$product->id}/media", ['images' => [UploadedFile::fake()->create('spec.pdf', 100, 'application/pdf')]], ['Accept' => 'application/json'])
            ->assertUnprocessable();
        $this->post("/api/v1/admin/products/{$product->id}/media", ['images' => [UploadedFile::fake()->image('tiny.png', 100, 100)]], ['Accept' => 'application/json'])
            ->assertUnprocessable();

        $res = $this->post("/api/v1/admin/products/{$product->id}/media", ['images' => [UploadedFile::fake()->image('photo.jpg', 1200, 1500)], 'color_name' => 'Noir'], ['Accept' => 'application/json'])
            ->assertCreated();
        $path = $product->media()->reorder()->latest('id')->first()->path;
        Storage::disk('public')->assertExists($path);
        $this->assertStringStartsWith('/storage/products/', $res->json('0.url'));
    }

    public function test_order_status_updates_persist_with_history(): void
    {
        $order = app(OrderService::class)->place($this->checkoutPayload([]), [['variant_id' => $this->stockedVariant()->id, 'quantity' => 1]]);
        $this->actingAs($this->admin(), 'sanctum');

        $this->putJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'confirmed'])->assertOk()->assertJsonPath('status', 'confirmed');
        $this->putJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'pending'])->assertUnprocessable();
        $this->assertSame('confirmed', Order::find($order->id)->status);
        $this->assertDatabaseHas('order_status_histories', ['order_id' => $order->id, 'from_status' => 'pending', 'to_status' => 'confirmed']);
    }

    public function test_homepage_announcement_change_reaches_storefront(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->putJson('/api/v1/admin/settings/homepage', ['announcement' => ['enabled' => true, 'text' => 'Autumn Edit — now live'], 'hero' => ['title' => 'Your Phone. Your Signature.']])
            ->assertOk();
        $this->getJson('/api/v1/storefront/settings')->assertJsonPath('announcement.text', 'Autumn Edit — now live');
        // Other homepage content is preserved by the partial update.
        $this->getJson('/api/v1/storefront/home')->assertJsonPath('handmade_story.title', 'Made by hand, one piece at a time.');
    }

    public function test_demo_reset_requires_admin_and_confirmation(): void
    {
        $this->postJson('/api/v1/admin/demo/reset', ['confirm' => 'RESET'])->assertUnauthorized();
        $this->actingAs($this->admin(), 'sanctum')->postJson('/api/v1/admin/demo/reset', ['confirm' => 'yes'])
            ->assertStatus(config('noire.allow_web_reset') ? 422 : 403);
    }

    public function test_deleting_a_product_soft_deletes_and_hides_it(): void
    {
        $this->actingAs($this->admin(), 'sanctum');
        $product = $this->product('studio-matte');
        $this->deleteJson("/api/v1/admin/products/{$product->id}")->assertOk();
        $this->assertSoftDeleted($product);
        $this->getJson('/api/v1/products/studio-matte')->assertNotFound();
    }
}
