<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Orders (with immutable line snapshots), status history, custom design
 * requests, newsletter opt-ins and key/value store settings.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('number', 32)->unique();
            $table->string('access_token', 64)->unique(); // private token for guest confirmation lookup
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 20)->default('pending')->index();
            $table->string('payment_method', 30);
            $table->string('payment_status', 20)->default('unpaid');
            $table->string('payment_reference')->nullable();
            $table->decimal('refunded_amount', 10, 2)->default(0);
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->index();
            $table->string('phone', 40);
            $table->string('country', 60);
            $table->string('city');
            $table->string('address_line1');
            $table->string('address_line2')->nullable();
            $table->text('customer_notes')->nullable();
            $table->text('internal_notes')->nullable();
            $table->string('shipping_method');
            $table->decimal('subtotal', 10, 2);
            $table->decimal('shipping_total', 10, 2)->default(0);
            $table->decimal('total', 10, 2);
            $table->char('currency', 3)->default('USD');
            $table->boolean('is_demo')->default(true);
            $table->timestamp('inventory_restored_at')->nullable(); // guards against double restock
            $table->timestamp('placed_at')->index();
            $table->timestamps();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained()->nullOnDelete();
            // Snapshots survive later product edits/deletion.
            $table->string('product_name');
            $table->string('product_type', 20);
            $table->string('sku', 64);
            $table->string('device_model')->nullable();
            $table->string('color_name', 60)->nullable();
            $table->string('image_url')->nullable();
            $table->decimal('unit_price', 10, 2);
            $table->unsignedInteger('quantity');
            $table->decimal('line_total', 10, 2);
            $table->json('customization')->nullable();
            $table->json('components')->nullable(); // bundle component snapshot
            $table->timestamps();
        });

        Schema::create('order_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('from_status', 20)->nullable();
            $table->string('to_status', 20);
            $table->string('note')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('custom_requests', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 32)->unique();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('device_model_id')->nullable()->constrained()->nullOnDelete();
            $table->string('style')->nullable();
            $table->string('colors')->nullable();
            $table->string('personalization', 60)->nullable();
            $table->text('instructions')->nullable();
            $table->string('reference_image_path')->nullable(); // private disk
            $table->string('name');
            $table->string('email');
            $table->string('phone', 40)->nullable();
            $table->string('status', 20)->default('new')->index(); // new|reviewing|quoted|approved|rejected|completed
            $table->decimal('quoted_price', 10, 2)->nullable();
            $table->text('internal_notes')->nullable();
            $table->timestamps();
        });

        Schema::create('newsletter_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('source', 40)->default('footer');
            $table->timestamps();
        });

        Schema::create('store_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_settings');
        Schema::dropIfExists('newsletter_subscriptions');
        Schema::dropIfExists('custom_requests');
        Schema::dropIfExists('order_status_histories');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
