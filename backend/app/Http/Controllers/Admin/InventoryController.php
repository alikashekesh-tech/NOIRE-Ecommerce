<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InventoryMovement;
use App\Models\ProductVariant;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $page = ProductVariant::with(['product:id,name,slug,type,status', 'deviceModel:id,name'])
            ->whereHas('product', fn ($p) => $p->where('type', '!=', 'bundle'))
            ->when($request->query('q'), fn ($q, $s) => $q->where(fn ($w) => $w->where('sku', 'like', "%{$s}%")->orWhere('color_name', 'like', "%{$s}%")
                ->orWhereHas('product', fn ($p) => $p->where('name', 'like', "%{$s}%"))))
            ->when($request->query('filter') === 'low', fn ($q) => $q->where('stock', '>', 0)->whereColumn('stock', '<=', 'low_stock_threshold'))
            ->when($request->query('filter') === 'out', fn ($q) => $q->where('stock', 0))
            ->orderBy('stock')->orderBy('sku')
            ->paginate(30)->withQueryString();

        return response()->json([
            'data' => collect($page->items())->map(fn ($v) => [
                'id' => $v->id, 'sku' => $v->sku, 'product_id' => $v->product_id, 'product' => $v->product->name,
                'product_status' => $v->product->status, 'device_model' => $v->deviceModel?->name, 'color_name' => $v->color_name,
                'color_hex' => $v->color_hex, 'stock' => $v->stock, 'low_stock_threshold' => $v->low_stock_threshold, 'is_active' => $v->is_active,
                'state' => $v->stock === 0 ? 'out' : ($v->stock <= $v->low_stock_threshold ? 'low' : 'ok'),
            ]),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
            'summary' => [
                'out' => ProductVariant::whereHas('product', fn ($p) => $p->where('type', '!=', 'bundle'))->where('stock', 0)->count(),
                'low' => ProductVariant::whereHas('product', fn ($p) => $p->where('type', '!=', 'bundle'))->where('stock', '>', 0)->whereColumn('stock', '<=', 'low_stock_threshold')->count(),
                'units' => (int) ProductVariant::whereHas('product', fn ($p) => $p->where('type', '!=', 'bundle'))->sum('stock'),
            ],
        ]);
    }

    public function adjust(Request $request, ProductVariant $variant, InventoryService $inventory): JsonResponse
    {
        abort_if($variant->isBundle(), 422, 'Matching-set stock is derived from its components.');
        $data = $request->validate([
            'mode' => ['required', 'in:set,change'],
            'value' => ['required', 'integer', 'between:-100000,100000'],
            'note' => ['nullable', 'string', 'max:200'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0', 'max:1000'],
        ]);
        if (isset($data['low_stock_threshold'])) {
            $variant->update(['low_stock_threshold' => $data['low_stock_threshold']]);
        }
        $updated = $data['mode'] === 'set'
            ? $inventory->setStock($variant, max(0, $data['value']), $data['note'] ?? null, $request->user()->id)
            : $inventory->adjust($variant, $data['value'], 'adjustment', null, $data['note'] ?? null, $request->user()->id);

        return response()->json(['id' => $updated->id, 'stock' => $updated->stock]);
    }

    public function movements(Request $request): JsonResponse
    {
        $rows = InventoryMovement::with(['variant:id,sku,product_id', 'variant.product:id,name', 'user:id,name'])
            ->when($request->query('variant_id'), fn ($q, $id) => $q->where('product_variant_id', $id))
            ->latest('id')->limit(100)->get();

        return response()->json($rows->map(fn ($m) => [
            'id' => $m->id, 'sku' => $m->variant?->sku, 'product' => $m->variant?->product?->name, 'change' => $m->change,
            'stock_after' => $m->stock_after, 'reason' => $m->reason, 'reference' => $m->reference, 'note' => $m->note,
            'user' => $m->user?->name, 'created_at' => $m->created_at,
        ]));
    }
}
