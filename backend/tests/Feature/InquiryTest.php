<?php

namespace Tests\Feature;

use App\Models\CustomRequest;
use App\Models\DeviceModel;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class InquiryTest extends TestCase
{
    public function test_custom_design_request_is_stored_with_private_image(): void
    {
        $res = $this->post('/api/v1/custom-requests', [
            'device_model_id' => DeviceModel::first()->id,
            'style' => 'Monogram', 'personalization' => 'LH', 'instructions' => 'Ivory italic initials',
            'name' => 'Lea Test', 'email' => 'lea@example.com',
            'reference_image' => UploadedFile::fake()->image('idea.jpg', 800, 800),
        ], ['Accept' => 'application/json'])->assertCreated();

        $req = CustomRequest::where('reference', $res->json('reference'))->firstOrFail();
        $this->assertSame('new', $req->status);
        Storage::disk('local')->assertExists($req->reference_image_path);
        Storage::disk('public')->assertMissing($req->reference_image_path);

        // Only admins can view the reference image or update the request.
        $this->get("/api/v1/admin/custom-requests/{$req->id}/image", ['Accept' => 'application/json'])->assertUnauthorized();
        $this->actingAs($this->admin(), 'sanctum')->get("/api/v1/admin/custom-requests/{$req->id}/image")->assertOk();
        $this->putJson("/api/v1/admin/custom-requests/{$req->id}", ['status' => 'quoted', 'quoted_price' => '95.00', 'internal_notes' => 'Demo quote'])
            ->assertOk()->assertJsonPath('status', 'quoted');
    }

    public function test_custom_request_rejects_non_images(): void
    {
        $this->post('/api/v1/custom-requests', [
            'device_model_id' => DeviceModel::first()->id, 'style' => 'Monogram', 'name' => 'X', 'email' => 'x@example.com',
            'reference_image' => UploadedFile::fake()->create('virus.exe', 10, 'application/octet-stream'),
        ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('reference_image');
    }

    public function test_newsletter_opt_in_is_stored_once(): void
    {
        $this->postJson('/api/v1/newsletter', ['email' => 'Fan@Example.com'])->assertCreated();
        $this->postJson('/api/v1/newsletter', ['email' => 'fan@example.com'])->assertCreated();
        $this->assertDatabaseCount('newsletter_subscriptions', 1);
    }
}
