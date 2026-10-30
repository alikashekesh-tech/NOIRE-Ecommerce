<?php

namespace App\Support;

class Media
{
    /**
     * Public media URLs are root-relative (/storage/...) so the SPA loads them
     * from its own origin (Vite proxy in dev, single domain in production).
     */
    public static function url(?string $path): ?string
    {
        if (! $path) {
            return null;
        }
        if (preg_match('#^(https?:)?//#', $path) || str_starts_with($path, '/')) {
            return $path;
        }

        return '/storage/'.ltrim($path, '/');
    }
}
