<?php

namespace Database\Seeders;

use App\Models\CustomRequest;
use App\Models\DeviceModel;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/** Fictional customers, demo orders (placed through the real order service) and custom requests. */
class DemoOrdersSeeder extends Seeder
{
    public function run(OrderService $orders): void
    {
        mt_srand(77);
        $customers = [
            ['Lea', 'Haddad', 'Beirut', 'Achrafieh, Sursock Street'],
            ['Karim', 'Nassar', 'Mount Lebanon', 'Jounieh, Main Road'],
            ['Maya', 'Khoury', 'Beirut', 'Hamra, Bliss Street'],
            ['Nour', 'Saade', 'North Lebanon', 'Tripoli, El Mina'],
            ['Rami', 'Aoun', 'Mount Lebanon', 'Baabda, Hazmieh'],
            ['Sara', 'Fares', 'South Lebanon', 'Saida, Riad El Solh Street'],
            ['Jad', 'Mansour', 'Bekaa', 'Zahle, Boulevard'],
        ];
        $users = [];
        foreach ($customers as [$first, $last]) {
            $users[] = User::create([
                'name' => "{$first} {$last}",
                'email' => Str::lower("{$first}.{$last}").'@example.com',
                'password' => Str::random(32),
                'role' => 'customer',
                'phone' => '+961 70 '.mt_rand(100, 999).' '.mt_rand(100, 999),
            ]);
        }

        $pool = ProductVariant::whereHas('product', fn ($p) => $p->published())->get()
            ->filter(fn ($v) => $v->availableStock() >= 3)->values();

        // [days ago, final status, payment]
        $plan = [
            [27, 'delivered', 'demo_card'], [24, 'delivered', 'demo_cod'], [21, 'delivered', 'demo_cod'],
            [18, 'cancelled', 'demo_card'], [15, 'delivered', 'demo_card'], [12, 'shipped', 'demo_cod'],
            [10, 'shipped', 'demo_card'], [8, 'preparing', 'demo_cod'], [6, 'preparing', 'demo_card'],
            [4, 'confirmed', 'demo_cod'], [3, 'confirmed', 'demo_card'], [2, 'pending', 'demo_cod'],
            [1, 'pending', 'demo_card'], [0, 'pending', 'demo_cod'],
        ];

        foreach ($plan as $n => [$daysAgo, $final, $payment]) {
            $ci = $n % count($customers);
            [$first, $last, $city, $address] = $customers[$ci];
            $items = [];
            foreach ((array) array_rand($pool->all(), mt_rand(1, 3)) as $idx) {
                $items[] = ['variant_id' => $pool[$idx]->id, 'quantity' => mt_rand(1, 10) > 8 ? 2 : 1];
            }

            $order = $orders->place([
                'first_name' => $first, 'last_name' => $last, 'email' => $users[$ci]->email, 'phone' => $users[$ci]->phone,
                'country' => 'Lebanon', 'city' => $city, 'address_line1' => $address,
                'shipping_method' => $n % 4 === 0 ? 'express' : 'standard', 'payment_method' => $payment,
                'notes' => $n === 5 ? 'Please call before delivery.' : null,
            ], $items, $users[$ci]->id);

            $placed = now()->subDays($daysAgo)->setTime(mt_rand(9, 21), mt_rand(0, 59));
            $order->forceFill(['placed_at' => $placed, 'created_at' => $placed])->save();
            OrderStatusHistory::where('order_id', $order->id)->update(['created_at' => $placed]);

            $step = 1;
            $targets = $final === 'cancelled' ? ['cancelled'] : array_slice(Order::FLOW, 1, array_search($final, Order::FLOW));
            foreach ($targets as $status) {
                $orders->transition($order->refresh(), $status, null, $status === 'cancelled' ? 'Cancelled at customer request (demo)' : null);
                OrderStatusHistory::where('order_id', $order->id)->latest('id')->first()
                    ->forceFill(['created_at' => (clone $placed)->addHours(8 * $step++)])->save();
            }
        }

        $models = DeviceModel::pluck('id', 'slug');
        $requests = [
            ['Maya Khoury', 'maya.khoury@example.com', 'iphone-17-pro', 'Pearl embellishment', 'Ivory and soft gold-free neutrals', 'MAYA', 'Pearls arranged around the camera, initials at the bottom.', 'new', null],
            ['Karim Nassar', 'karim.nassar@example.com', 'iphone-18-pro-max', 'Monogram', 'Charcoal with ivory lettering', 'K.N.', 'Matching power bank if possible.', 'quoted', 95],
            ['Lea Haddad', 'lea.haddad@example.com', 'iphone-17', 'Embroidered florals', 'Ivory, sage and mocha', null, 'Inspired by spring wildflowers — smaller flowers please.', 'reviewing', null],
            ['Nour Saade', 'nour.saade@example.com', 'iphone-18-pro', 'Abstract painting', 'Charcoal and sand', 'N', 'Gift for my sister, needed before the end of the month.', 'approved', 82],
        ];
        $atelier = Product::where('slug', 'atelier-edition')->value('id');
        foreach ($requests as $i => [$name, $email, $model, $style, $colors, $text, $notes, $status, $quote]) {
            CustomRequest::create([
                'reference' => 'CR-'.strtoupper(Str::random(6)),
                'product_id' => $i === 2 ? $atelier : null,
                'device_model_id' => $models[$model],
                'style' => $style, 'colors' => $colors, 'personalization' => $text, 'instructions' => $notes,
                'name' => $name, 'email' => $email, 'status' => $status, 'quoted_price' => $quote,
                'internal_notes' => $quote ? 'Quotation prepared in demo — no message sent to customer.' : null,
                'created_at' => now()->subDays(6 - $i),
            ]);
        }
    }
}
