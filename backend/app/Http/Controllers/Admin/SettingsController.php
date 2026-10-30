<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\StoreSetting;
use App\Support\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

class SettingsController extends Controller
{
    /** Validation per settings group. Unknown keys are rejected. */
    private function rules(string $key): array
    {
        return match ($key) {
            'store' => [
                'name' => ['required', 'string', 'max:60'], 'tagline' => ['nullable', 'string', 'max:120'],
                'description' => ['nullable', 'string', 'max:300'], 'contact_email' => ['nullable', 'email', 'max:120'],
                'business_info' => ['nullable', 'string', 'max:500'], 'demo_badge' => ['nullable', 'string', 'max:30'],
            ],
            'whatsapp' => [
                'enabled' => ['boolean'], 'number' => ['nullable', 'string', 'max:20', 'regex:/^\+?[0-9 ]{0,20}$/'],
                'default_message' => ['nullable', 'string', 'max:300'],
                'templates' => ['array', 'max:10'], 'templates.*.key' => ['required', 'string', 'max:30'],
                'templates.*.label' => ['required', 'string', 'max:60'], 'templates.*.message' => ['required', 'string', 'max:500'],
            ],
            'shipping' => [
                'countries' => ['required', 'array', 'min:1'], 'countries.*' => ['string', 'max:60'],
                'areas' => ['array'], 'areas.*' => ['string', 'max:60'],
                'free_threshold' => ['nullable', 'numeric', 'min:0'],
                'methods' => ['required', 'array', 'min:1'], 'methods.*.code' => ['required', 'alpha_dash', 'max:30'],
                'methods.*.name' => ['required', 'string', 'max:60'], 'methods.*.fee' => ['required', 'numeric', 'min:0'],
                'methods.*.estimate' => ['nullable', 'string', 'max:120'], 'methods.*.enabled' => ['boolean'], 'methods.*.free_eligible' => ['boolean'],
                'delivery_note' => ['nullable', 'string', 'max:300'],
            ],
            'social' => ['instagram' => ['nullable', 'url:https'], 'tiktok' => ['nullable', 'url:https'], 'facebook' => ['nullable', 'url:https']],
            'homepage' => [
                'announcement' => ['array'], 'announcement.enabled' => ['boolean'], 'announcement.text' => ['nullable', 'string', 'max:120'],
                'announcement.link_label' => ['nullable', 'string', 'max:40'], 'announcement.link_url' => ['nullable', 'string', 'max:200', 'regex:#^/#'],
                'hero' => ['array'], 'hero.eyebrow' => ['nullable', 'string', 'max:60'], 'hero.title' => ['required', 'string', 'max:80'],
                'hero.description' => ['nullable', 'string', 'max:300'], 'hero.primary_label' => ['nullable', 'string', 'max:40'],
                'hero.primary_url' => ['nullable', 'string', 'max:200', 'regex:#^/#'], 'hero.secondary_label' => ['nullable', 'string', 'max:40'],
                'hero.secondary_url' => ['nullable', 'string', 'max:200', 'regex:#^/#'], 'hero.image_desktop' => ['nullable', 'string', 'max:255'],
                'hero.image_mobile' => ['nullable', 'string', 'max:255'],
                'handmade_story' => ['array'], 'handmade_story.*' => ['nullable', 'string', 'max:1000'],
                'complete_the_look' => ['array'], 'complete_the_look.*' => ['nullable', 'string', 'max:300'],
                'featured_product_ids' => ['array'], 'featured_product_ids.*' => ['integer'],
                'sections' => ['array'], 'sections.*' => ['boolean'],
            ],
            'pages' => ['*' => ['array'], '*.title' => ['required', 'string', 'max:80'], '*.body' => ['required', 'string', 'max:10000']],
            default => abort(404, 'Unknown settings group.'),
        };
    }

    public function index(): JsonResponse
    {
        return response()->json([
            ...StoreSetting::allValues(),
            'demo' => ['demo_mode' => config('noire.demo_mode'), 'allow_web_reset' => config('noire.demo_mode') && config('noire.allow_web_reset')],
        ]);
    }

    public function update(Request $request, string $key): JsonResponse
    {
        $validated = $request->validate($this->rules($key));
        if ($key === 'whatsapp') {
            $validated['number'] = preg_replace('/[^0-9+]/', '', (string) ($validated['number'] ?? ''));
        }
        // Merge onto the stored value so partial forms don't drop unrelated fields.
        $value = array_replace_recursive(StoreSetting::read($key, []), $validated);
        foreach (['templates', 'methods', 'areas', 'countries', 'featured_product_ids'] as $listKey) {
            if (array_key_exists($listKey, $validated)) {
                $value[$listKey] = array_values($validated[$listKey]);
            }
        }
        StoreSetting::write($key, $value);

        return response()->json($value);
    }

    public function heroImage(Request $request): JsonResponse
    {
        $request->validate(['image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240', 'dimensions:min_width=800,min_height=800']]);

        return response()->json(['url' => Media::url($request->file('image')->store('homepage', 'public'))], 201);
    }

    /** Demo-only, admin-only, explicitly confirmed. Never available outside demo mode. */
    public function resetDemo(Request $request): JsonResponse
    {
        abort_unless(config('noire.demo_mode') && config('noire.allow_web_reset'), 403, 'Demo reset is disabled.');
        $request->validate(['confirm' => ['required', 'in:RESET']], ['confirm.in' => 'Type RESET to confirm.']);

        Artisan::call('noire:demo-reset', ['--force' => true]);

        return response()->json(['message' => 'Demo data has been reset. Please sign in again.']);
    }
}
