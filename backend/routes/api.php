<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\InquiryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\StorefrontController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // ---- Public storefront -------------------------------------------------
    Route::get('storefront/settings', [StorefrontController::class, 'settings']);
    Route::get('storefront/home', [StorefrontController::class, 'home']);
    Route::get('pages/{slug}', [StorefrontController::class, 'page']);
    Route::get('products', [ProductController::class, 'index']);
    Route::get('products/{slug}', [ProductController::class, 'show']);
    Route::get('collections/{slug}', [ProductController::class, 'collection']);
    Route::get('variants', [ProductController::class, 'variants']);

    Route::post('cart/quote', [CheckoutController::class, 'quote'])->middleware('throttle:120,1');
    Route::post('checkout', [CheckoutController::class, 'store'])->middleware('throttle:checkout');
    Route::get('orders/{number}', [CheckoutController::class, 'show'])->middleware('throttle:30,1');
    Route::post('custom-requests', [InquiryController::class, 'customRequest'])->middleware('throttle:forms');
    Route::post('newsletter', [InquiryController::class, 'newsletter'])->middleware('throttle:forms');

    // ---- Admin -------------------------------------------------------------
    Route::prefix('admin')->group(function () {
        Route::post('login', [Admin\AuthController::class, 'login'])->middleware('throttle:login');

        Route::middleware(['auth:sanctum', 'admin'])->group(function () {
            Route::post('logout', [Admin\AuthController::class, 'logout']);
            Route::get('me', [Admin\AuthController::class, 'me']);
            Route::get('dashboard', Admin\DashboardController::class);

            Route::get('products', [Admin\ProductController::class, 'index']);
            Route::post('products', [Admin\ProductController::class, 'store']);
            Route::get('products/{product}', [Admin\ProductController::class, 'show'])->withTrashed();
            Route::put('products/{product}', [Admin\ProductController::class, 'update']);
            Route::delete('products/{product}', [Admin\ProductController::class, 'destroy']);
            Route::post('products/{product}/duplicate', [Admin\ProductController::class, 'duplicate']);

            Route::post('products/{product}/variants', [Admin\VariantController::class, 'store']);
            Route::put('variants/{variant}', [Admin\VariantController::class, 'update']);
            Route::delete('variants/{variant}', [Admin\VariantController::class, 'destroy']);
            Route::put('variants/{variant}/components', [Admin\VariantController::class, 'components']);

            Route::post('products/{product}/media', [Admin\MediaController::class, 'store']);
            Route::put('products/{product}/media/order', [Admin\MediaController::class, 'reorder']);
            Route::put('media/{media}', [Admin\MediaController::class, 'update']);
            Route::delete('media/{media}', [Admin\MediaController::class, 'destroy']);

            Route::get('inventory', [Admin\InventoryController::class, 'index']);
            Route::post('inventory/{variant}/adjust', [Admin\InventoryController::class, 'adjust']);
            Route::get('inventory/movements', [Admin\InventoryController::class, 'movements']);

            Route::get('orders', [Admin\OrderController::class, 'index']);
            Route::get('orders/{order}', [Admin\OrderController::class, 'show']);
            Route::put('orders/{order}/status', [Admin\OrderController::class, 'status']);
            Route::put('orders/{order}/notes', [Admin\OrderController::class, 'notes']);
            Route::post('orders/{order}/refund', [Admin\OrderController::class, 'refund']);

            Route::get('customers', [Admin\CustomerController::class, 'index']);
            Route::get('custom-requests', [Admin\CustomRequestController::class, 'index']);
            Route::put('custom-requests/{customRequest}', [Admin\CustomRequestController::class, 'update']);
            Route::get('custom-requests/{customRequest}/image', [Admin\CustomRequestController::class, 'image']);

            Route::get('collections', [Admin\CatalogSetupController::class, 'collections']);
            Route::post('collections', [Admin\CatalogSetupController::class, 'storeCollection']);
            Route::post('collections/{collection}', [Admin\CatalogSetupController::class, 'updateCollection']); // multipart
            Route::get('device-models', [Admin\CatalogSetupController::class, 'deviceModels']);
            Route::post('device-models', [Admin\CatalogSetupController::class, 'storeDeviceModel']);
            Route::put('device-models/{deviceModel}', [Admin\CatalogSetupController::class, 'updateDeviceModel']);
            Route::get('variant-search', [Admin\CatalogSetupController::class, 'variantSearch']);

            Route::get('settings', [Admin\SettingsController::class, 'index']);
            Route::put('settings/{key}', [Admin\SettingsController::class, 'update']);
            Route::post('settings/hero-image', [Admin\SettingsController::class, 'heroImage']);
            Route::post('demo/reset', [Admin\SettingsController::class, 'resetDemo'])->middleware('throttle:3,10');
        });
    });
});
