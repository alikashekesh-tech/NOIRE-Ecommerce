<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    public function __construct(private OrderService $orders) {}

    public function index(Request $request): JsonResponse
    {
        $page = Order::withCount('items')
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('q'), fn ($q, $s) => $q->where(fn ($w) => $w->where('number', 'like', "%{$s}%")
                ->orWhere('email', 'like', "%{$s}%")->orWhere('last_name', 'like', "%{$s}%")->orWhere('first_name', 'like', "%{$s}%")))
            ->latest('placed_at')->paginate(20)->withQueryString();

        return response()->json([
            'data' => collect($page->items())->map(fn (Order $o) => [
                'id' => $o->id, 'number' => $o->number, 'customer' => $o->customer_name, 'email' => $o->email, 'city' => $o->city,
                'status' => $o->status, 'payment_method' => $o->payment_method_label, 'payment_status' => $o->payment_status,
                'total' => $o->total, 'items_count' => $o->items_count, 'placed_at' => $o->placed_at, 'is_demo' => $o->is_demo,
            ]),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
            'counts' => Order::selectRaw('status, COUNT(*) as c')->groupBy('status')->pluck('c', 'status'),
        ]);
    }

    public function show(Order $order): JsonResponse
    {
        $order->load(['items', 'history.user:id,name']);

        return response()->json([
            ...$order->makeHidden('access_token')->toArray(),
            'customer_name' => $order->customer_name,
            'payment_method_label' => $order->payment_method_label,
            'next_statuses' => $this->nextStatuses($order),
            'customer_order_count' => Order::where('email', $order->email)->count(),
        ]);
    }

    public function status(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(Order::STATUSES)], 'note' => ['nullable', 'string', 'max:200']]);
        $this->orders->transition($order, $data['status'], $request->user()->id, $data['note'] ?? null);

        return $this->show($order->refresh());
    }

    public function notes(Request $request, Order $order): JsonResponse
    {
        $order->update($request->validate(['internal_notes' => ['nullable', 'string', 'max:2000']]));

        return $this->show($order);
    }

    public function refund(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate(['amount' => ['required', 'decimal:0,2', 'min:0.01']]);
        $this->orders->recordSimulatedRefund($order, (float) $data['amount'], $request->user()->id);

        return $this->show($order->refresh());
    }

    /** @return array<int, string> */
    private function nextStatuses(Order $order): array
    {
        if (in_array($order->status, ['cancelled', 'delivered'], true)) {
            return [];
        }
        $pos = array_search($order->status, Order::FLOW, true);
        $next = array_slice(Order::FLOW, $pos + 1);

        return $order->status === 'shipped' ? $next : [...$next, 'cancelled'];
    }
}
