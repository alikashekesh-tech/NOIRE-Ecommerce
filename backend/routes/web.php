<?php

use Illuminate\Support\Facades\Route;

// The storefront and admin are served by the React app; the API lives under /api/v1.
Route::get('/', fn () => response()->json(['name' => 'NOIRÉ API', 'api' => url('/api/v1'), 'demo_mode' => config('noire.demo_mode')]));
