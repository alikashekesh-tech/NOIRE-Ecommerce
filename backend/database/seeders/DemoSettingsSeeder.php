<?php

namespace Database\Seeders;

use App\Models\StoreSetting;
use Illuminate\Database\Seeder;

/** Default store configuration. All copy is demonstration content. */
class DemoSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $q = 'Hello NOIRÉ! ';
        $settings = [
            'store' => [
                'name' => 'NOIRÉ',
                'tagline' => 'Designed to Be Different.',
                'description' => 'Fashion-forward iPhone cases, handmade creations and perfectly matched accessories.',
                'contact_email' => null, // not invented — set by the client
                'business_info' => 'Demonstration store. Business details will be added once confirmed by the client.',
                'demo_badge' => 'Demo Store',
            ],
            'whatsapp' => [
                'enabled' => true,
                'number' => '', // intentionally blank: links open a safe preview until the client number is set
                'default_message' => $q.'I have a question about your collection.',
                'templates' => [
                    ['key' => 'price', 'label' => 'Ask about the price', 'message' => $q."I'm interested in the {product}{variant}. Could you tell me more about the price? Product: {url}"],
                    ['key' => 'availability', 'label' => 'Check availability', 'message' => $q."I'm interested in the {product}{variant}. Could you tell me more about its availability? Product: {url}"],
                    ['key' => 'model', 'label' => 'Ask about this phone model', 'message' => $q."Is the {product} available for {model}? Product: {url}"],
                    ['key' => 'customization', 'label' => 'Ask about customization', 'message' => $q."I'd love to personalise the {product}{variant}. What customization options are available? Product: {url}"],
                    ['key' => 'delivery', 'label' => 'Ask about delivery', 'message' => $q."How long would delivery take for the {product}{variant}? Product: {url}"],
                    ['key' => 'other', 'label' => 'Ask another question', 'message' => $q."I have a question about the {product}{variant}. Product: {url}"],
                ],
            ],
            'shipping' => [
                'countries' => ['Lebanon'],
                'areas' => ['Beirut', 'Mount Lebanon', 'North Lebanon', 'Akkar', 'Baalbek-Hermel', 'Bekaa', 'South Lebanon', 'Nabatieh'],
                'free_threshold' => 100,
                'methods' => [
                    ['code' => 'standard', 'name' => 'Standard Delivery', 'fee' => 4, 'estimate' => '2–4 business days (demo estimate)', 'enabled' => true, 'free_eligible' => true],
                    ['code' => 'express', 'name' => 'Express Delivery', 'fee' => 8, 'estimate' => 'Next business day, Greater Beirut (demo estimate)', 'enabled' => true, 'free_eligible' => false],
                ],
                'delivery_note' => 'Demo delivery information — final rates, areas and timings are to be confirmed.',
            ],
            'social' => ['instagram' => '', 'tiktok' => '', 'facebook' => ''],
            'homepage' => [
                'announcement' => ['enabled' => true, 'text' => 'Designed to Be Different.', 'link_label' => 'Discover Handmade', 'link_url' => '/collections/handmade-creations'],
                'hero' => [
                    'eyebrow' => 'The Signature Edit',
                    'title' => 'Your Phone. Your Signature.',
                    'description' => 'Discover thoughtfully designed cases, handcrafted creations, and perfectly matched accessories.',
                    'primary_label' => 'Shop the Collection',
                    'primary_url' => '/shop',
                    'secondary_label' => 'Discover Handmade',
                    'secondary_url' => '/collections/handmade-creations',
                    'image_desktop' => '/storage/demo/home/hero-desktop.svg',
                    'image_mobile' => '/storage/demo/home/hero-mobile.svg',
                ],
                'handmade_story' => [
                    'eyebrow' => 'The Atelier',
                    'title' => 'Made by hand, one piece at a time.',
                    'body' => 'Every handmade NOIRÉ case begins as a blank canvas. Embroidery, hand-set pearls, painted initials and braided cord are added slowly and carefully, so each piece carries the quiet signature of the hands that made it.',
                    'note' => 'Demonstration brand story — final copy to be provided by NOIRÉ.',
                    'cta_label' => 'Explore Handmade',
                    'cta_url' => '/collections/handmade-creations',
                    'image' => '/storage/demo/home/handmade-story.svg',
                ],
                'complete_the_look' => [
                    'eyebrow' => 'Complete the Look',
                    'title' => 'Perfectly paired.',
                    'description' => 'Choose a case and its matching magnetic power bank — together, as one considered set.',
                    'bundle_slug' => 'the-matching-edit-quilted',
                ],
                'featured_product_ids' => [],
                'sections' => [
                    'models' => true, 'collections' => true, 'bestsellers' => true, 'complete_the_look' => true,
                    'handmade_story' => true, 'new_arrivals' => true, 'newsletter' => true,
                ],
            ],
            'pages' => [
                'about' => ['title' => 'About NOIRÉ', 'body' => "NOIRÉ creates fashion-forward accessories for iPhone — refined signature cases, handmade creations and perfectly matched sets.\n\nThis page contains demonstration copy. The final brand story will be supplied by NOIRÉ."],
                'shipping' => ['title' => 'Shipping', 'body' => "We currently plan to deliver across Lebanon.\n\nStandard Delivery: 2–4 business days (demo estimate).\nExpress Delivery: next business day within Greater Beirut (demo estimate).\n\nDelivery fees, areas and timings shown on this demonstration site are sample values and are not yet confirmed."],
                'returns' => ['title' => 'Returns & Exchanges', 'body' => "The returns policy for NOIRÉ is being finalised.\n\nThis demonstration page is a placeholder. Handmade and personalised items may be subject to different terms once the policy is confirmed."],
                'privacy' => ['title' => 'Privacy Policy', 'body' => "This is a demonstration website. Information entered in demo checkouts or forms is stored only in the demo database for presentation purposes and is not used for marketing.\n\nA full privacy policy will be published before launch."],
                'terms' => ['title' => 'Terms of Service', 'body' => "This website is a client demonstration. No real orders are fulfilled, no payments are collected and all prices are sample values.\n\nFull terms of service will be published before launch."],
                'care' => ['title' => 'Care Guide', 'body' => "Wipe cases with a soft, dry or slightly damp cloth. Avoid solvents, prolonged moisture and direct heat.\n\nHandmade pieces deserve extra care — keep embellished surfaces away from abrasive materials."],
            ],
        ];

        foreach ($settings as $key => $value) {
            StoreSetting::write($key, $value);
        }
    }
}
