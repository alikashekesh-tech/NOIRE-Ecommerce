<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CartItemsRequest;
use App\Http\Requests\CheckoutRequest;
use App\Models\Order;
use App\Services\CartService;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CheckoutController extends Controller
{
    public function quote(CartItemsRequest $request, CartService $cart): JsonResponse
    {
        return response()->json($cart->quote($request->validated('items'), $request->validated('shipping_method')));
    }

    public function store(CheckoutRequest $request, OrderService $orders): JsonResponse
    {
        $order = $orders->place($request->validated(), $request->validated('items'), $request->user()?->id);

        return response()->json([
            'number' => $order->number,
            'token' => $order->access_token,
        ], 201);
    }

    /** Guest confirmation: requires the private access token issued at checkout. */
    public function show(Request $request, string $number): JsonResponse
    {
        $order = Order::with('items')->where('number', $number)->first();
        if (! $order || ! hash_equals($order->access_token, (string) $request->query('token'))) {
            abort(404);
        }

        return response()->json([
            'number' => $order->number,
            'status' => $order->status,
            'is_demo' => $order->is_demo,
            'placed_at' => $order->placed_at,
            'payment_method' => $order->payment_method_label,
            'payment_status' => $order->payment_status,
            'payment_reference' => $order->payment_reference,
            'customer' => [
                'name' => $order->customer_name, 'email' => $order->email, 'phone' => $order->phone,
                'address' => array_values(array_filter([$order->address_line1, $order->address_line2, $order->city, $order->country])),
            ],
            'shipping_method' => $order->shipping_method,
            'items' => $order->items->map->only(['product_name', 'product_type', 'sku', 'device_model', 'color_name', 'image_url', 'unit_price', 'quantity', 'line_total', 'customization', 'components']),
            'subtotal' => $order->subtotal,
            'shipping_total' => $order->shipping_total,
            'total' => $order->total,
            'currency' => $order->currency,
        ]);
    }
}
