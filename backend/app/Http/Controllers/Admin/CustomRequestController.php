<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CustomRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CustomRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $rows = CustomRequest::with(['product:id,name,slug', 'deviceModel:id,name'])
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest()->get();

        return response()->json($rows->map(fn (CustomRequest $r) => [
            ...$r->only(['id', 'reference', 'style', 'colors', 'personalization', 'instructions', 'name', 'email', 'phone', 'status', 'quoted_price', 'internal_notes', 'created_at']),
            'product' => $r->product?->only(['name', 'slug']),
            'device_model' => $r->deviceModel?->name,
            'has_image' => (bool) $r->reference_image_path,
        ]));
    }

    public function update(Request $request, CustomRequest $customRequest): JsonResponse
    {
        $customRequest->update($request->validate([
            'status' => ['required', Rule::in(CustomRequest::STATUSES)],
            'quoted_price' => ['nullable', 'decimal:0,2', 'min:0', 'max:99999'],
            'internal_notes' => ['nullable', 'string', 'max:2000'],
        ]));

        return response()->json($customRequest);
    }

    /** Reference images live on the private disk and are only streamed to admins. */
    public function image(CustomRequest $customRequest): StreamedResponse
    {
        $path = $customRequest->reference_image_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, null, ['Cache-Control' => 'private, max-age=600', 'X-Content-Type-Options' => 'nosniff']);
    }
}
