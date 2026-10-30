<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;

Artisan::command('noire:demo-reset {--force : Skip the confirmation prompt}', function () {
    if (! config('noire.demo_mode')) {
        $this->error('Refusing to reset: DEMO_MODE is not enabled.');

        return 1;
    }
    $db = config('database.connections.'.config('database.default').'.database');
    if (! $this->option('force') && ! $this->confirm("This will erase and re-seed ALL data in [{$db}]. Continue?")) {
        return 1;
    }

    // Only NOIRÉ-owned storage folders are cleared.
    foreach (['demo', 'products', 'collections', 'homepage'] as $dir) {
        Storage::disk('public')->deleteDirectory($dir);
    }
    Storage::disk('local')->deleteDirectory('custom-requests');

    $this->call('migrate:fresh', ['--seed' => true, '--force' => true]);
    $this->info('NOIRÉ demo data has been reset.');

    return 0;
})->purpose('Reset the NOIRÉ demo database and media (demo mode only)');
