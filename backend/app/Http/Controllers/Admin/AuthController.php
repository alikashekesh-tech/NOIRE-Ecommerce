<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/** Session-based (Sanctum SPA) admin authentication. */
class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);

        if (! Auth::guard('web')->attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages(['email' => 'These credentials do not match our records.']);
        }
        if (! Auth::guard('web')->user()->isAdmin()) {
            Auth::guard('web')->logout();
            throw ValidationException::withMessages(['email' => 'This account does not have administrator access.']);
        }
        $request->session()->regenerate();

        return $this->me($request);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'role' => $user->role,
            'demo_mode' => config('noire.demo_mode'), 'allow_web_reset' => config('noire.demo_mode') && config('noire.allow_web_reset'),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Signed out']);
    }
}
