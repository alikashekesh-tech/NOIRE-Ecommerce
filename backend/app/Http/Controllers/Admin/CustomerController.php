<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Customers are derived from demo orders (guest checkout), enriched with any matching account. */
class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $page = Order::query()
            ->select('email', DB::raw('MAX(first_name) as first_name'), DB::raw('MAX(last_name) as last_name'), DB::raw('MAX(phone) as phone'),
                DB::raw('MAX(city) as city'), DB::raw('COUNT(*) as orders_count'),
                DB::raw("SUM(CASE WHEN status <> 'cancelled' THEN total ELSE 0 END) as total_spent"), DB::raw('MAX(placed_at) as last_order_at'))
            ->when($request->query('q'), fn ($q, $s) => $q->where(fn ($w) => $w->where('email', 'like', "%{$s}%")->orWhere('last_name', 'like', "%{$s}%")->orWhere('first_name', 'like', "%{$s}%")))
            ->groupBy('email')->orderByDesc('last_order_at')->paginate(25)->withQueryString();

        $accounts = User::whereIn('email', collect($page->items())->pluck('email'))->pluck('is_active', 'email');
        $orders = Order::whereIn('email', collect($page->items())->pluck('email'))->latest('placed_at')
            ->get(['id', 'email', 'number', 'status', 'total', 'placed_at'])->groupBy('email');

        return response()->json([
            'data' => collect($page->items())->map(fn ($c) => [
                'email' => $c->email, 'name' => trim("{$c->first_name} {$c->last_name}"), 'phone' => $c->phone, 'city' => $c->city,
                'orders_count' => (int) $c->orders_count, 'total_spent' => number_format((float) $c->total_spent, 2, '.', ''),
                'last_order_at' => $c->last_order_at,
                'account' => $accounts->has($c->email) ? ($accounts[$c->email] ? 'active' : 'disabled') : 'guest',
                'orders' => ($orders[$c->email] ?? collect())->take(5)->values(),
            ]),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }
}
