<?php

namespace Database\Seeders;

use App\Models\Collection;
use App\Models\DeviceModel;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Models\ProductVariant;
use App\Support\DemoArt;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Fictional demo catalogue. Product names, prices and specs are sample data,
 * not client-approved products. Replace via the admin or a new seeder.
 */
class DemoCatalogSeeder extends Seeder
{
    private const COLORS = [
        'Charcoal' => '#17181C', 'Ivory' => '#EFE8DC', 'Mocha' => '#7A5C49', 'Noir' => '#0E0E10',
        'Slate' => '#5D6670', 'Stone' => '#BDB6AA', 'Sage' => '#A8B09A', 'Sand' => '#D9C7AE',
        'Taupe' => '#A39382', 'Bordeaux' => '#5A2A2E', 'Olive' => '#6B6A4A', 'Natural' => '#E4D9C6',
        'Cream' => '#F6F1E7', 'Frost' => '#E9E9E6', 'Ivory Marble' => '#ECE7DE', 'Nero Marble' => '#1E1F23',
    ];

    private const ACCENTS = [
        'Ivory Marble' => '#8D8579', 'Nero Marble' => '#8E8A84',
    ];

    /** @var array<string, DeviceModel> */
    private array $models = [];

    public function run(): void
    {
        mt_srand(2026);
        Storage::disk('public')->deleteDirectory('demo');

        $this->seedDeviceModels();
        $collections = $this->seedCollections();

        $all = array_keys($this->models);
        $pro = ['iphone-17-pro', 'iphone-17-pro-max', 'iphone-18-pro', 'iphone-18-pro-max'];
        $f17 = ['iphone-17', 'iphone-17-pro', 'iphone-17-pro-max'];
        $f18 = ['iphone-18', 'iphone-18-pro', 'iphone-18-pro-max'];
        $proMax = ['iphone-17-pro-max', 'iphone-18-pro-max'];

        $leatherCare = 'Wipe with a soft, dry cloth. Avoid prolonged contact with water, solvents and direct heat.';
        $siliconeCare = 'Clean with a slightly damp, lint-free cloth. Remove the case before cleaning the phone.';
        $handCare = 'Handle gently — each piece is finished by hand. Keep away from moisture and abrasive surfaces; wipe with a soft, dry cloth.';

        $cases = [
            // name, code, collection, material, pattern, colors, models, price, flags, short, care, extra
            ['Noiré Signature Case', 'SIG', 'signature', 'Vegan leather', 'leather', ['Charcoal', 'Ivory', 'Mocha'], $all, 48, ['featured', 'bestseller'], 'Our quiet signature: soft-grain vegan leather with a precise, slim profile.', $leatherCare],
            ['Midnight Form', 'MID', 'signature', 'Matte silicone', 'smooth', ['Noir', 'Slate'], $all, 39, ['bestseller'], 'A deep matte finish with a velvet-soft touch and raised camera protection.', $siliconeCare],
            ['Soft Sculpture', 'SOF', 'signature', 'Soft-touch silicone', 'ribbed', ['Stone', 'Sage', 'Charcoal'], $all, 42, ['new', 'featured'], 'Sculpted ribbing that catches the light, wrapped in a soft-touch finish.', $siliconeCare],
            ['Ivory Muse', 'IVM', 'signature', 'Vegan leather', 'leather', ['Ivory', 'Sand'], $all, 52, ['featured', 'bestseller'], 'Pale, luminous vegan leather — understated, refined, endlessly wearable.', $leatherCare],
            ['Quilted Atelier', 'QAT', 'signature', 'Quilted vegan leather', 'quilted', ['Charcoal', 'Ivory'], $pro, 58, ['featured'], 'Couture-inspired diamond quilting with a cushioned, tactile feel.', $leatherCare],
            ['Linea Ribbed Case', 'LIN', 'signature', 'Soft-touch silicone', 'ribbed', ['Taupe', 'Charcoal'], $f17, 36, [], 'Fine vertical lines and a featherlight build for everyday elegance.', $siliconeCare],
            ['Marble Étude', 'MAR', 'signature', 'Polycarbonate', 'marble', ['Ivory Marble', 'Nero Marble'], $all, 45, ['new'], 'Soft marble veining printed on a glossy, scratch-resistant shell.', $siliconeCare],
            ['Clear Frame Essential', 'CLR', 'signature', 'Polycarbonate', 'clear', ['Frost'], $all, 34, [], 'A frosted, clear shell that lets the original finish of your iPhone show through.', $siliconeCare],
            ['Monochrome Grid', 'GRD', 'signature', 'Polycarbonate', 'grid', ['Ivory', 'Charcoal'], $f18, 44, ['new'], 'A graphic two-tone grid — bold, architectural and unmistakably NOIRÉ.', $siliconeCare],
            ['Velvet Hour', 'VEL', 'signature', 'Microfiber suede', 'leather', ['Bordeaux', 'Olive'], $proMax, 54, ['limited'], 'Suede-touch microfiber in deep evening tones. A limited seasonal run.', $leatherCare],
            ['Contour Wave', 'WAV', 'signature', 'Soft-touch silicone', 'wave', ['Sand', 'Slate'], $all, 40, [], 'Flowing contour lines inspired by sand and tide.', $siliconeCare],
            ['Noir Croc Edition', 'CRC', 'signature', 'Embossed vegan leather', 'croc', ['Noir', 'Mocha'], $pro, 56, ['limited', 'bestseller'], 'A croc-embossed texture with a deep, polished sheen.', $leatherCare],
            ['Gallery Frame', 'GAL', 'signature', 'Polycarbonate', 'frame', ['Stone', 'Charcoal'], $all, 38, [], 'A minimal inset frame — like a gallery mount for your everyday object.', $siliconeCare],
            ['Studio Matte', 'STU', 'signature', 'Matte silicone', 'smooth', ['Sage', 'Taupe', 'Ivory'], $f17, 32, [], 'Clean, matte and essential. The easiest case you will ever own.', $siliconeCare],
            ['Archive Stripe', 'ARC', 'signature', 'Polycarbonate', 'stripe', ['Ivory', 'Charcoal'], $all, 42, ['new'], 'Wide archival stripes in our two signature tones.', $siliconeCare],
            // Handmade
            ['Atelier Edition', 'ATL', 'handmade', 'Hand-embroidered fabric', 'floral', ['Ivory'], ['iphone-17-pro', 'iphone-17-pro-max', 'iphone-18-pro-max'], 95, ['handmade', 'limited', 'custom', 'featured'], 'Hand-embroidered blooms on a soft ivory ground — every piece is unique.', $handCare, [5, 7]],
            ['Pearl Reverie', 'PRL', 'handmade', 'Hand-set faux pearls', 'pearl', ['Ivory', 'Charcoal'], $all, 88, ['handmade', 'custom', 'bestseller'], 'Faux pearls set by hand in a graceful arc.', $handCare, [4, 6]],
            ['Monogram Muse', 'MON', 'handmade', 'Hand-painted vegan leather', 'initials', ['Charcoal', 'Mocha', 'Ivory'], $all, 72, ['handmade', 'custom', 'featured'], 'Your initials, hand-painted in an elegant italic serif.', $handCare, [3, 5]],
            ['Pressed Bloom', 'PBL', 'handmade', 'Resin with pressed botanicals', 'botanical', ['Cream'], $f17, 78, ['handmade', 'limited'], 'Real pressed botanicals preserved in clear resin. One of a kind.', $handCare, [6, 9]],
            ['Woven Cord', 'WOV', 'handmade', 'Hand-braided cord', 'woven', ['Sand', 'Charcoal'], $proMax, 84, ['handmade', 'new'], 'A hand-braided basket weave with a warm, natural texture.', $handCare, [5, 8]],
            ['Brushstroke Study', 'BRS', 'handmade', 'Hand-painted polycarbonate', 'brush', ['Ivory'], $all, 76, ['handmade', 'limited', 'new'], 'Expressive abstract brushwork — no two cases are alike.', $handCare, [4, 6]],
            ['Linen Stitch', 'LNS', 'handmade', 'Hand-stitched linen', 'stitch', ['Natural', 'Stone'], $f18, 68, ['handmade'], 'Natural linen with visible hand-stitching for a quiet, crafted finish.', $handCare, [4, 7]],
            ['Ink Constellation', 'INK', 'handmade', 'Hand-painted polycarbonate', 'dots', ['Charcoal'], $all, 74, ['handmade'], 'A hand-dotted constellation in soft ivory ink on charcoal.', $handCare, [3, 5]],
            ['Initial Charm', 'CHM', 'handmade', 'Hand-strung beads', 'beads', ['Ivory', 'Sand'], ['iphone-17-pro', 'iphone-18-pro'], 82, ['handmade', 'custom'], 'A hand-strung bead charm spelling your name across the case.', $handCare, [5, 7]],
        ];

        $made = [];
        foreach ($cases as $i => $c) {
            $made[$c[1]] = $this->createCase($c, $collections, $i);
        }

        // Power banks — demo specifications, to be confirmed by the client.
        $banks = [
            ['Essential Magnetic Power Bank', 'EPB', 'Vegan leather', 'leather', ['Charcoal', 'Ivory', 'Mocha'], 49, '5,000 mAh', ['bestseller'], 'SIG'],
            ['Slim Leather Power Bank', 'SPB', 'Vegan leather', 'leather', ['Ivory', 'Sand'], 59, '5,000 mAh', ['new'], 'IVM'],
            ['Quilted Power Bank', 'QPB', 'Quilted vegan leather', 'quilted', ['Charcoal', 'Ivory'], 65, '5,000 mAh', ['featured'], 'QAT'],
            ['Marble Power Bank', 'MPB', 'Polycarbonate', 'marble', ['Ivory Marble', 'Nero Marble'], 69, '10,000 mAh', [], 'MAR'],
            ['Pearl Power Bank', 'PPB', 'Hand-set faux pearls', 'pearl', ['Ivory', 'Charcoal'], 79, '5,000 mAh', ['handmade'], 'PRL'],
            ['Monogram Power Bank', 'NPB', 'Hand-painted vegan leather', 'initials', ['Charcoal', 'Mocha'], 64, '5,000 mAh', ['handmade'], 'MON'],
        ];
        $bankProducts = [];
        foreach ($banks as $i => $b) {
            $bankProducts[$b[1]] = $this->createPowerBank($b, $collections, $made[$b[8]], 40 + $i);
        }

        // Bundles (matching sets) — composed of existing case + power bank variants.
        $bundles = [
            ['The Matching Edit — Signature', 'MSIG', 'SIG', 'EPB', 89, ['featured', 'bestseller']],
            ['The Matching Edit — Ivory Muse', 'MIVM', 'IVM', 'SPB', 99, ['new']],
            ['The Matching Edit — Quilted', 'MQAT', 'QAT', 'QPB', 109, ['featured']],
            ['The Matching Edit — Marble', 'MMAR', 'MAR', 'MPB', 99, []],
            ['The Matching Edit — Pearl', 'MPRL', 'PRL', 'PPB', 149, ['handmade']],
            ['The Matching Edit — Monogram', 'MMON', 'MON', 'NPB', 125, ['handmade']],
        ];
        foreach ($bundles as $i => $b) {
            $this->createBundle($b, $made[$b[2]], $bankProducts[$b[3]], $collections, 60 + $i);
        }

        $this->seedCollectionArt($collections);
    }

    private function seedDeviceModels(): void
    {
        $rows = [
            ['iPhone 17', '17', 'iphone-17', 'iPhone 17'], ['iPhone 17 Pro', '17 Pro', 'iphone-17-pro', 'iPhone 17'],
            ['iPhone 17 Pro Max', '17 Pro Max', 'iphone-17-pro-max', 'iPhone 17'], ['iPhone 18', '18', 'iphone-18', 'iPhone 18'],
            ['iPhone 18 Pro', '18 Pro', 'iphone-18-pro', 'iPhone 18'], ['iPhone 18 Pro Max', '18 Pro Max', 'iphone-18-pro-max', 'iPhone 18'],
        ];
        foreach ($rows as $i => [$name, $short, $slug, $family]) {
            $this->models[$slug] = DeviceModel::create(['name' => $name, 'short_name' => $short, 'slug' => $slug, 'family' => $family, 'sort_order' => $i]);
        }
    }

    /** @return array<string, Collection> */
    private function seedCollections(): array
    {
        return [
            'signature' => Collection::create([
                'name' => 'Signature Cases', 'slug' => 'signature-cases', 'sort_order' => 1,
                'tagline' => 'Refined essentials in our signature tones.',
                'description' => 'Precise silhouettes, considered materials and a palette of ivory, charcoal and soft neutrals — designed for every day.',
            ]),
            'handmade' => Collection::create([
                'name' => 'Handmade Creations', 'slug' => 'handmade-creations', 'sort_order' => 2,
                'tagline' => 'Crafted by hand. One at a time.',
                'description' => 'Embroidered, painted, beaded and braided by hand — limited pieces and personalised designs made to order.',
            ]),
            'matching' => Collection::create([
                'name' => 'Matching Sets', 'slug' => 'matching-sets', 'sort_order' => 3,
                'tagline' => 'Your case, perfectly paired.',
                'description' => 'Coordinated cases and magnetic power banks, available individually or as a complete set.',
            ]),
        ];
    }

    private function createCase(array $c, array $collections, int $sort): Product
    {
        [$name, $code, $col, $material, $pattern, $colors, $models, $price, $flags, $short, $care] = $c;
        $days = $c[11] ?? null;
        $product = Product::create([
            'name' => $name,
            'slug' => Str::slug($name),
            'type' => 'case',
            'status' => 'published',
            'short_description' => $short,
            'description' => $this->caseDescription($name, $material, in_array('handmade', $flags)),
            'material' => $material,
            'care_instructions' => $care,
            'specs' => array_filter([
                'Material' => $material,
                'Finish' => ucfirst($pattern === 'smooth' ? 'matte' : $pattern),
                'Protection' => 'Raised edges around screen and camera',
                'Magnetic charging' => in_array($pattern, ['clear', 'smooth', 'leather', 'quilted', 'ribbed', 'croc', 'marble', 'grid', 'wave', 'frame', 'stripe']) ? 'Built-in magnetic ring (demo spec — to be confirmed)' : null,
            ]),
            'is_featured' => in_array('featured', $flags),
            'is_bestseller' => in_array('bestseller', $flags),
            'is_new_arrival' => in_array('new', $flags),
            'is_handmade' => in_array('handmade', $flags),
            'is_limited_edition' => in_array('limited', $flags),
            'is_customizable' => in_array('custom', $flags),
            'production_days_min' => $days[0] ?? null,
            'production_days_max' => $days[1] ?? null,
            'sort_order' => $sort,
            'published_at' => now()->subDays(in_array('new', $flags) ? mt_rand(1, 12) : mt_rand(20, 120)),
        ]);
        $product->collections()->attach($collections[$col]->id, ['sort_order' => $sort]);

        $i = 0;
        foreach ($colors as $color) {
            foreach ($models as $slug) {
                $m = $this->models[$slug];
                $this->variant($product, $m, $color, "NR-{$code}-".$this->modelCode($slug).'-'.$this->colorCode($color),
                    $price + (str_ends_with($slug, 'pro-max') ? 4 : 0), $i++, in_array('handmade', $flags));
            }
        }

        $monogram = match ($code) { 'MON' => 'AK', 'CHM' => 'NOIRE', default => null };
        $opts = fn ($color, $extra = []) => [
            'color' => self::COLORS[$color], 'pattern' => $pattern, 'monogram' => $monogram,
            'accent' => $this->accentFor($pattern, $color), 'camera' => 'pro', ...$extra,
        ];
        $first = $colors[0];
        $light = DemoArt::luma(self::COLORS[$first]) > .5;
        $images = [[$first, DemoArt::caseImage($opts($first)), "{$name} in {$first}, back view"]];
        $images[] = [null, DemoArt::caseImage($opts($first, ['view' => 'angle', 'bg' => $light ? 'dark' : 'sand'])), "{$name} in {$first}, angled view"];
        $images[] = [null, DemoArt::caseImage($opts($first, ['view' => 'detail', 'bg' => 'stone'])), "{$name} camera surround detail"];
        foreach (array_slice($colors, 1) as $color) {
            $images[] = [$color, DemoArt::caseImage($opts($color, ['bg' => DemoArt::luma(self::COLORS[$color]) > .5 ? 'ivory' : 'sand'])), "{$name} in {$color}, back view"];
        }
        $this->storeImages($product, $images);

        return $product;
    }

    private function createPowerBank(array $b, array $collections, Product $matchingCase, int $sort): Product
    {
        [$name, $code, $material, $pattern, $colors, $price, $capacity, $flags] = $b;
        $product = Product::create([
            'name' => $name,
            'slug' => Str::slug($name),
            'type' => 'power_bank',
            'status' => 'published',
            'short_description' => "A slim magnetic power bank in {$material}, designed to pair with the {$matchingCase->name}.",
            'description' => "Designed as the companion to the {$matchingCase->name}, this compact power bank shares its material and tone for a coordinated look.\n\nIt attaches magnetically to compatible iPhone models and charges over USB-C. Final technical specifications, certifications and warranty terms are pending confirmation and are shown here as demonstration values only.",
            'material' => $material,
            'care_instructions' => 'Keep dry and away from heat. Do not puncture or disassemble. Charge with a certified USB-C adapter.',
            'specs' => [
                'Capacity' => "{$capacity} (demo value)",
                'Charging' => 'Magnetic wireless + USB-C (demo value)',
                'Compatibility' => 'Designed for magnetic-charging iPhone models. Confirm compatibility for your model before purchase.',
                'Warranty' => 'To be confirmed by NOIRÉ',
            ],
            'is_featured' => in_array('featured', $flags),
            'is_bestseller' => in_array('bestseller', $flags),
            'is_new_arrival' => in_array('new', $flags),
            'is_handmade' => in_array('handmade', $flags),
            'sort_order' => $sort,
            'published_at' => now()->subDays(mt_rand(5, 90)),
        ]);
        $product->collections()->attach($collections['matching']->id, ['sort_order' => $sort]);

        foreach ($colors as $i => $color) {
            $this->variant($product, null, $color, "NR-{$code}-".$this->colorCode($color), $price, $i, in_array('handmade', $flags));
        }

        $monogram = $pattern === 'initials' ? 'AK' : null;
        $images = [];
        foreach ($colors as $i => $color) {
            $images[] = [$color, DemoArt::powerBankImage(['color' => self::COLORS[$color], 'pattern' => $pattern, 'accent' => $this->accentFor($pattern, $color), 'monogram' => $monogram, 'bg' => $i ? 'sand' : 'ivory']), "{$name} in {$color}"];
            if ($i === 0) {
                $images[] = [null, DemoArt::powerBankImage(['color' => self::COLORS[$color], 'pattern' => $pattern, 'accent' => $this->accentFor($pattern, $color), 'monogram' => $monogram, 'view' => 'angle', 'bg' => DemoArt::luma(self::COLORS[$color]) > .5 ? 'dark' : 'stone']), "{$name}, angled view"];
            }
        }
        $this->storeImages($product, $images);

        // Matching relation in both directions.
        $matchingCase->matching()->attach($product->id, ['type' => 'matching']);
        $product->matching()->attach($matchingCase->id, ['type' => 'matching']);

        return $product;
    }

    private function createBundle(array $b, Product $case, Product $bank, array $collections, int $sort): void
    {
        [$name, $code, , , $price, $flags] = $b;
        $product = Product::create([
            'name' => $name,
            'slug' => Str::slug($name),
            'type' => 'bundle',
            'status' => 'published',
            'short_description' => "The {$case->name} and {$bank->name}, coordinated as one set.",
            'description' => "A complete look: the {$case->name} paired with the matching {$bank->name}. Choose your iPhone model and tone — both pieces arrive together.\n\nBundle pricing is demonstration pricing and not a confirmed offer.",
            'material' => $case->material,
            'care_instructions' => $case->care_instructions,
            'is_featured' => in_array('featured', $flags),
            'is_bestseller' => in_array('bestseller', $flags),
            'is_new_arrival' => in_array('new', $flags),
            'is_handmade' => in_array('handmade', $flags) || $case->is_handmade,
            'production_days_min' => $case->production_days_min,
            'production_days_max' => $case->production_days_max,
            'sort_order' => $sort,
            'published_at' => now()->subDays(mt_rand(3, 60)),
        ]);
        $product->collections()->attach($collections['matching']->id, ['sort_order' => $sort]);

        $bankVariants = $bank->variants()->get()->keyBy('color_name');
        $i = 0;
        $images = [];
        foreach ($case->variants()->with('deviceModel')->get() as $cv) {
            $bv = $bankVariants->get($cv->color_name);
            if (! $bv) {
                continue; // only colours that exist for both pieces
            }
            $variant = ProductVariant::create([
                'product_id' => $product->id,
                'device_model_id' => $cv->device_model_id,
                'sku' => "NR-{$code}-".$this->modelCode($cv->deviceModel->slug).'-'.$this->colorCode($cv->color_name),
                'color_name' => $cv->color_name,
                'color_hex' => $cv->color_hex,
                'price' => $price + (str_ends_with($cv->deviceModel->slug, 'pro-max') ? 4 : 0),
                'stock' => 0, // bundle availability is derived from its components
                'sort_order' => $i++,
            ]);
            $variant->components()->attach([$cv->id => ['quantity' => 1], $bv->id => ['quantity' => 1]]);

            if (! isset($images[$cv->color_name])) {
                $pattern = $this->patternOf($case);
                $hex = self::COLORS[$cv->color_name];
                $images[$cv->color_name] = [$cv->color_name, DemoArt::bundleImage(
                    ['color' => $hex, 'pattern' => $pattern, 'accent' => $this->accentFor($pattern, $cv->color_name), 'monogram' => $pattern === 'initials' ? 'AK' : null],
                    ['color' => $hex, 'pattern' => $pattern, 'accent' => $this->accentFor($pattern, $cv->color_name), 'monogram' => $pattern === 'initials' ? 'AK' : null],
                    count($images) % 2 ? 'stone' : 'sand',
                ), "{$name} in {$cv->color_name}: case with matching power bank"];
            }
        }
        $this->storeImages($product, array_values($images));

        foreach ([$case, $bank] as $p) {
            $p->matching()->attach($product->id, ['type' => 'matching']);
        }
    }

    private function variant(Product $product, ?DeviceModel $model, string $color, string $sku, float $price, int $sort, bool $handmade): void
    {
        $roll = mt_rand(1, 100);
        $stock = match (true) {
            $roll <= 7 => 0,
            $roll <= 20 => mt_rand(1, 3),
            default => $handmade ? mt_rand(4, 9) : mt_rand(6, 28),
        };
        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'device_model_id' => $model?->id,
            'sku' => $sku,
            'color_name' => $color,
            'color_hex' => self::COLORS[$color],
            'price' => $price,
            'stock' => $stock,
            'low_stock_threshold' => 3,
            'sort_order' => $sort,
        ]);
        InventoryMovement::create(['product_variant_id' => $variant->id, 'change' => $stock, 'stock_after' => $stock, 'reason' => 'seed', 'note' => 'Initial demo stock']);
    }

    /** @param array<int, array{0:?string,1:string,2:string}> $images [color, svg, alt] */
    private function storeImages(Product $product, array $images): void
    {
        foreach ($images as $i => [$color, $svg, $alt]) {
            $path = "demo/products/{$product->slug}-".($i + 1).'.svg';
            Storage::disk('public')->put($path, $svg);
            ProductMedia::create([
                'product_id' => $product->id, 'color_name' => $color, 'type' => 'image', 'path' => $path,
                'alt' => $alt.' (demo render)', 'width' => 1200, 'height' => 1500, 'sort_order' => $i, 'is_primary' => $i === 0,
            ]);
        }
    }

    private function seedCollectionArt(array $collections): void
    {
        $c = self::COLORS;
        $put = fn ($path, $svg) => Storage::disk('public')->put($path, $svg) ? $path : null;

        $collections['signature']->update(['image_path' => $put('demo/collections/signature.svg', DemoArt::scene(1200, 1500, 'sand', [
            ['kind' => 'case', 'opts' => ['color' => $c['Ivory'], 'pattern' => 'leather'], 'x' => 480, 'y' => 560, 's' => .6, 'r' => -9],
            ['kind' => 'case', 'opts' => ['color' => $c['Charcoal'], 'pattern' => 'leather'], 'x' => 730, 'y' => 520, 's' => .6, 'r' => 7],
        ]))]);
        $collections['handmade']->update(['image_path' => $put('demo/collections/handmade.svg', DemoArt::scene(1200, 1500, 'ivory', [
            ['kind' => 'case', 'opts' => ['color' => $c['Ivory'], 'pattern' => 'floral', 'accent' => '#7A5C49'], 'x' => 470, 'y' => 550, 's' => .6, 'r' => -8],
            ['kind' => 'case', 'opts' => ['color' => $c['Charcoal'], 'pattern' => 'pearl'], 'x' => 740, 'y' => 580, 's' => .6, 'r' => 8],
        ]))]);
        $collections['matching']->update(['image_path' => $put('demo/collections/matching.svg', DemoArt::scene(1200, 1500, 'dark', [
            ['kind' => 'case', 'opts' => ['color' => $c['Ivory'], 'pattern' => 'quilted'], 'x' => 500, 'y' => 540, 's' => .62, 'r' => -6],
            ['kind' => 'bank', 'opts' => ['color' => $c['Ivory'], 'pattern' => 'quilted'], 'x' => 780, 'y' => 650, 's' => .5, 'r' => 8],
        ]))]);

        // Homepage hero (desktop: subject on the right, text-safe left; mobile: subject low).
        $put('demo/home/hero-desktop.svg', DemoArt::scene(1920, 1080, 'sand', [
            ['kind' => 'case', 'opts' => ['color' => $c['Charcoal'], 'pattern' => 'leather'], 'x' => 1210, 'y' => 590, 's' => .5, 'r' => -12],
            ['kind' => 'case', 'opts' => ['color' => $c['Ivory'], 'pattern' => 'quilted'], 'x' => 1450, 'y' => 560, 's' => .53, 'r' => 4],
            ['kind' => 'bank', 'opts' => ['color' => $c['Ivory'], 'pattern' => 'quilted'], 'x' => 1680, 'y' => 700, 's' => .4, 'r' => 12],
        ]));
        $put('demo/home/hero-mobile.svg', DemoArt::scene(900, 1200, 'sand', [
            ['kind' => 'case', 'opts' => ['color' => $c['Charcoal'], 'pattern' => 'leather'], 'x' => 350, 'y' => 930, 's' => .4, 'r' => -12],
            ['kind' => 'case', 'opts' => ['color' => $c['Ivory'], 'pattern' => 'quilted'], 'x' => 560, 'y' => 900, 's' => .43, 'r' => 6],
        ]));
        $put('demo/home/handmade-story.svg', DemoArt::scene(1200, 1500, 'stone', [
            ['kind' => 'case', 'opts' => ['color' => $c['Ivory'], 'pattern' => 'floral', 'accent' => '#5A2A2E'], 'x' => 600, 'y' => 760, 's' => .92, 'r' => -6],
        ]));
    }

    private function caseDescription(string $name, string $material, bool $handmade): string
    {
        $material = lcfirst($material);

        return $handmade
            ? "Each {$name} is finished by hand in small batches, so subtle variations in detail are part of its character. Crafted in {$material} over a protective shell with raised edges for the screen and camera.\n\nHandmade pieces are produced to order — the estimated production time is shown above."
            : "The {$name} pairs a slim, protective shell with {$material} and a precise fit around buttons and camera. Raised edges help protect the screen and lenses, while the finish is designed to stay beautiful with everyday use.\n\nDesigned for the selected iPhone model only — please choose your model before adding to bag.";
    }

    private function accentFor(string $pattern, string $color): string
    {
        $hex = self::COLORS[$color];
        if (isset(self::ACCENTS[$color])) {
            return self::ACCENTS[$color];
        }
        $light = DemoArt::luma($hex) > .5;

        return match ($pattern) {
            'grid', 'stripe', 'frame', 'initials', 'dots', 'beads' => $light ? '#17181C' : '#EFE8DC',
            'floral', 'brush' => $light ? '#7A5C49' : '#EFE8DC',
            'botanical' => '#6B6A4A',
            default => DemoArt::shade($hex, $light ? -22 : 25),
        };
    }

    private function patternOf(Product $case): string
    {
        return match (true) {
            str_contains($case->slug, 'quilted') => 'quilted',
            str_contains($case->slug, 'marble') => 'marble',
            str_contains($case->slug, 'pearl') => 'pearl',
            str_contains($case->slug, 'monogram') => 'initials',
            default => 'leather',
        };
    }

    private function modelCode(string $slug): string
    {
        return strtoupper(str_replace(['iphone-', '-pro-max', '-pro'], ['', 'PM', 'P'], $slug));
    }

    private function colorCode(string $color): string
    {
        return strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $color), 0, 3)).(str_contains($color, ' ') ? substr(strrchr($color, ' '), 1, 1) : '');
    }
}
