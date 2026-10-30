<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** Demo metrics computed from recorded database rows (cancelled orders excluded from revenue). */
class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $countable = Order::countable();
        $since = now()->subDays(29)->startOfDay();

        $daily = Order::countable()->where('placed_at', '>=', $since)
            ->selectRaw('DATE(placed_at) as day, SUM(total) as revenue, COUNT(*) as orders')
            ->groupBy('day')->pluck('revenue', 'day');
        $chart = collect(range(0, 29))->map(function ($i) use ($since, $daily) {
            $day = Carbon::parse($since)->addDays($i)->toDateString();

            return ['date' => $day, 'revenue' => round((float) ($daily[$day] ?? 0), 2)];
        });

        $itemsQuery = fn () => OrderItem::whereHas('order', fn ($o) => $o->countable());

        return response()->json([
            'is_demo' => config('noire.demo_mode'),
            'totals' => [
                'revenue' => number_format((float) (clone $countable)->sum('total'), 2, '.', ''),
                'orders' => Order::count(),
                'open_orders' => Order::whereIn('status', ['pending', 'confirmed', 'preparing'])->count(),
                'products' => Product::count(),
                'published_products' => Product::published()->count(),
                'customers' => Order::distinct('email')->count('email'),
                'average_order' => number_format((float) (clone $countable)->avg('total'), 2, '.', ''),
            ],
            'status_breakdown' => Order::select('status', DB::raw('COUNT(*) as count'))->groupBy('status')->pluck('count', 'status'),
            'sales_chart' => $chart,
            'recent_orders' => Order::latest('placed_at')->limit(8)->get()
                ->map(fn ($o) => ['id' => $o->id, 'number' => $o->number, 'customer' => $o->customer_name, 'total' => $o->total, 'status' => $o->status, 'placed_at' => $o->placed_at]),
            'best_sellers' => $itemsQuery()->select('product_name', DB::raw('SUM(quantity) as units'), DB::raw('SUM(line_total) as revenue'))
                ->groupBy('product_name')->orderByDesc('units')->limit(5)->get(),
            'popular_models' => $itemsQuery()->whereNotNull('device_model')->select('device_model', DB::raw('SUM(quantity) as units'))
                ->groupBy('device_model')->orderByDesc('units')->get(),
            'low_stock' => ProductVariant::with('product:id,name,type', 'deviceModel:id,name')
                ->whereHas('product', fn ($p) => $p->where('type', '!=', 'bundle'))
                ->whereColumn('stock', '<=', 'low_stock_threshold')->where('is_active', true)
                ->orderBy('stock')->limit(10)->get()
                ->map(fn ($v) => ['id' => $v->id, 'product_id' => $v->product_id, 'product' => $v->product->name, 'sku' => $v->sku, 'label' => $v->label(), 'stock' => $v->stock]),
        ]);
    }
}
