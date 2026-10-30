import { defineConfig } from '@playwright/test'

// End-to-end tests run against the real stack: `php artisan serve` (:8000) + `npm run dev` (:5173).
// Uses the locally installed Microsoft Edge (Chromium) so no browser download is needed.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    channel: 'msedge',
    trace: 'retain-on-failure',
  },
})
