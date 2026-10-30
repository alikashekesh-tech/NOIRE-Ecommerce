<?php

namespace App\Http\Requests;

use App\Models\Order;
use App\Models\StoreSetting;

class CheckoutRequest extends CartItemsRequest
{
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'items' => ['required', 'array', 'min:1', 'max:30'],
            'first_name' => ['required', 'string', 'max:60'],
            'last_name' => ['required', 'string', 'max:60'],
            'email' => ['required', 'email:rfc', 'max:120'],
            'phone' => ['required', 'string', 'max:30', 'regex:/^[+0-9 ()\-]{6,30}$/'],
            'country' => ['required', 'string', 'in:'.implode(',', StoreSetting::read('shipping', [])['countries'] ?? ['Lebanon'])],
            'city' => ['required', 'string', 'max:80'],
            'address_line1' => ['required', 'string', 'max:160'],
            'address_line2' => ['nullable', 'string', 'max:160'],
            'notes' => ['nullable', 'string', 'max:500'],
            'shipping_method' => ['required', 'string', 'max:40'],
            'payment_method' => ['required', 'in:'.implode(',', array_keys(Order::PAYMENT_METHODS))],
            // Simulated card payments must be explicitly confirmed — no card data is ever collected.
            'simulate_payment' => ['required_if:payment_method,demo_card', 'accepted_if:payment_method,demo_card'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'Please enter a valid phone number.',
            'simulate_payment.accepted_if' => 'Please confirm the simulated payment.',
            'simulate_payment.required_if' => 'Please confirm the simulated payment.',
        ];
    }
}
