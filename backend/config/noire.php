<?php

return [
    /*
    | Demo mode: payments are simulated, no outbound email/WhatsApp/shipping
    | calls are made, orders are flagged is_demo and pages are noindex.
    */
    'demo_mode' => (bool) env('DEMO_MODE', true),

    // Allows an authenticated admin to reset demo data from the dashboard (demo mode only).
    'allow_web_reset' => (bool) env('DEMO_ALLOW_WEB_RESET', false),

    // Development-only seed credentials — set in .env, never committed.
    'demo_admin_email' => env('DEMO_ADMIN_EMAIL', 'admin@noire.demo'),
    'demo_admin_password' => env('DEMO_ADMIN_PASSWORD'),

    'currency' => 'USD',

    'order_prefix' => env('ORDER_PREFIX', 'NR-DEMO'),

    'max_line_quantity' => 10,
];
