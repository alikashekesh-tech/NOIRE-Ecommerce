<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomRequest;
use App\Models\NewsletterSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/** Custom design requests and newsletter opt-ins — stored only, nothing is sent. */
class InquiryController extends Controller
{
    public function customRequest(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
            'device_model_id' => ['required', 'integer', 'exists:device_models,id'],
            'style' => ['required', 'string', 'max:80'],
            'colors' => ['nullable', 'string', 'max:120'],
            'personalization' => ['nullable', 'string', 'max:40'],
            'instructions' => ['nullable', 'string', 'max:1500'],
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email:rfc', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^[+0-9 ()\-]{6,30}$/'],
            'reference_image' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=6000,max_height=6000'],
        ]);

        $path = $request->file('reference_image')?->store('custom-requests', 'local'); // private disk
        unset($data['reference_image']);

        $custom = CustomRequest::create([
            ...$data,
            'reference' => 'CR-'.strtoupper(Str::random(6)),
            'reference_image_path' => $path,
        ]);

        return response()->json(['reference' => $custom->reference], 201);
    }

    public function newsletter(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email:rfc', 'max:120'], 'source' => ['nullable', 'string', 'max:40']]);
        NewsletterSubscription::firstOrCreate(['email' => mb_strtolower($data['email'])], ['source' => $data['source'] ?? 'footer']);

        return response()->json(['message' => 'Subscribed (demo — no emails are sent).'], 201);
    }
}
