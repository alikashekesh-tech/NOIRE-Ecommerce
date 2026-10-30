<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\VariantRequest;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VariantController extends Controller
{
    public function __construct(private InventoryService $inventory) {}

    public function store(VariantRequest $request, Product $product): JsonResponse
    {
        $data = $request->validated();
        $stock = $product->type === 'bundle' ? 0 : (int) ($data['stock'] ?? 0);
        $variant = DB::transaction(function () use ($product, $data, $stock, $request) {
            $variant = $product->variants()->create([...$data, 'stock' => $stock, 'low_stock_threshold' => $data['low_stock_threshold'] ?? 3]);
            if ($stock > 0) {
                InventoryMovement::create(['product_variant_id' => $variant->id, 'change' => $stock, 'stock_after' => $stock, 'reason' => 'adjustment', 'note' => 'Initial stock', 'user_id' => $request->user()->id]);
            }

            return $variant;
        });

        return response()->json($variant->load('deviceModel'), 201);
    }

    public function update(VariantRequest $request, ProductVariant $variant): JsonResponse
    {
        $data = $request->validated();
        $stock = $data['stock'] ?? null;
        unset($data['stock']);
        DB::transaction(function () use ($variant, $data, $stock, $request) {
            $variant->update($data);
            if ($stock !== null && ! $variant->isBundle()) {
                $this->inventory->setStock($variant, (int) $stock, 'Edited in product form', $request->user()->id);
            }
        });

        return response()->json($variant->refresh()->load('deviceModel'));
    }

    public function destroy(ProductVariant $variant): JsonResponse
    {
        if (DB::table('bundle_items')->where('component_variant_id', $variant->id)->exists()) {
            throw ValidationException::withMessages(['variant' => 'This variant is part of a matching set. Remove it from the set first, or deactivate it instead.']);
        }
        $variant->delete(); // order items keep their snapshot (FK set null)

        return response()->json(['message' => 'Variant deleted']);
    }

    /** Set the component variants of a bundle variant. */
    public function components(Request $request, ProductVariant $variant): JsonResponse
    {
        if (! $variant->isBundle()) {
            throw ValidationException::withMessages(['variant' => 'Only matching-set variants have components.']);
        }
        $data = $request->validate([
            'components' => ['required', 'array', 'min:1', 'max:6'],
            'components.*.variant_id' => ['required', 'integer', 'distinct', 'exists:product_variants,id'],
            'components.*.quantity' => ['required', 'integer', 'min:1', 'max:5'],
        ]);
        $ids = collect($data['components'])->pluck('variant_id');
        $bundleIds = ProductVariant::whereIn('id', $ids)->whereHas('product', fn ($p) => $p->where('type', 'bundle'))->exists();
        if ($bundleIds) {
            throw ValidationException::withMessages(['components' => 'A matching set cannot contain another matching set.']);
        }
        $variant->components()->sync(collect($data['components'])->mapWithKeys(fn ($c) => [$c['variant_id'] => ['quantity' => $c['quantity']]]));

        return response()->json(['available' => $variant->refresh()->availableStock()]);
    }
}
