<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catalog: device models, collections, products, variants, media,
 * product relations (matching accessories), bundle components and
 * inventory movements. Money is stored as DECIMAL(10,2) — never float.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('device_models', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('short_name', 40);
            $table->string('slug')->unique();
            $table->string('family', 40)->index();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('collections', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('tagline')->nullable();
            $table->text('description')->nullable();
            $table->string('image_path')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_published')->default(true)->index();
            $table->string('seo_title')->nullable();
            $table->string('seo_description', 320)->nullable();
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('type', 20)->default('case')->index(); // case | power_bank | bundle
            $table->string('status', 20)->default('draft')->index(); // draft | published | archived
            $table->string('short_description', 500)->nullable();
            $table->text('description')->nullable();
            $table->string('material')->nullable()->index();
            $table->text('care_instructions')->nullable();
            $table->json('specs')->nullable(); // power banks: capacity, charging, compatibility, warranty
            $table->string('video_url')->nullable();
            $table->boolean('is_featured')->default(false)->index();
            $table->boolean('is_bestseller')->default(false)->index();
            $table->boolean('is_new_arrival')->default(false)->index();
            $table->boolean('is_handmade')->default(false)->index();
            $table->boolean('is_limited_edition')->default(false);
            $table->boolean('is_customizable')->default(false);
            $table->unsignedSmallInteger('production_days_min')->nullable();
            $table->unsignedSmallInteger('production_days_max')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('seo_title')->nullable();
            $table->string('seo_description', 320)->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('collection_product', function (Blueprint $table) {
            $table->foreignId('collection_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('sort_order')->default(0);
            $table->primary(['collection_id', 'product_id']);
        });

        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('device_model_id')->nullable()->constrained()->nullOnDelete();
            $table->string('sku', 64)->unique();
            $table->string('color_name', 60);
            $table->string('color_hex', 9)->default('#17181C');
            // Normalised "device|color" key so the same combination can't exist twice (NULL-safe).
            $table->string('combination_key', 140);
            $table->decimal('price', 10, 2);
            $table->decimal('compare_at_price', 10, 2)->nullable();
            $table->unsignedInteger('stock')->default(0); // unsigned: stock can never go negative
            $table->unsignedSmallInteger('low_stock_threshold')->default(3);
            $table->boolean('is_active')->default(true)->index();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['product_id', 'combination_key']);
            $table->index(['device_model_id', 'is_active']);
        });

        Schema::create('product_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('color_name', 60)->nullable(); // show this image when the colour is selected
            $table->string('type', 10)->default('image');
            $table->string('path');
            $table->string('alt')->nullable();
            $table->unsignedSmallInteger('width')->nullable();
            $table->unsignedSmallInteger('height')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
            $table->index(['product_id', 'sort_order']);
        });

        Schema::create('product_relations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('related_product_id')->constrained('products')->cascadeOnDelete();
            $table->string('type', 20)->default('matching'); // matching | related
            $table->unsignedInteger('sort_order')->default(0);
            $table->unique(['product_id', 'related_product_id', 'type']);
        });

        // A bundle is a product (type=bundle) whose variants are composed of component variants.
        // Bundle variants hold no stock of their own; availability and deduction use the components.
        Schema::create('bundle_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bundle_variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->foreignId('component_variant_id')->constrained('product_variants')->restrictOnDelete();
            $table->unsignedSmallInteger('quantity')->default(1);
            $table->unique(['bundle_variant_id', 'component_variant_id']);
        });

        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained()->cascadeOnDelete();
            $table->integer('change');
            $table->unsignedInteger('stock_after');
            $table->string('reason', 30); // seed | adjustment | order | cancellation
            $table->string('reference')->nullable();
            $table->string('note')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
            $table->index(['product_variant_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('bundle_items');
        Schema::dropIfExists('product_relations');
        Schema::dropIfExists('product_media');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('collection_product');
        Schema::dropIfExists('products');
        Schema::dropIfExists('collections');
        Schema::dropIfExists('device_models');
    }
};
