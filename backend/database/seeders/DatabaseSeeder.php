<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $password = config('noire.demo_admin_password') ?: Str::password(16);
        User::create([
            'name' => 'NOIRÉ Admin',
            'email' => config('noire.demo_admin_email'),
            'password' => $password,
            'role' => 'admin',
        ]);
        if (! config('noire.demo_admin_password')) {
            $this->command?->warn("Generated demo admin password: {$password}");
        }

        $this->call([DemoSettingsSeeder::class, DemoCatalogSeeder::class]);

        if (! app()->runningUnitTests()) {
            $this->call(DemoOrdersSeeder::class);
        }
    }
}
