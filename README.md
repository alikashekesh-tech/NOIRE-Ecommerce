# NOIRÉ — Premium iPhone Accessories (Client Demo)

A working full-stack demonstration store for **NOIRÉ**: designer iPhone 17/18 cases, handmade covers and matching power-bank sets.

**Stack:** React 19 + Vite 8 + Tailwind 4 (frontend) · Laravel 13 + Sanctum (API) · MySQL (data).

> **Demo only.** Payments are simulated, no emails or WhatsApp messages are sent automatically, nothing ships, and all products, prices, specs and customers are fictional sample data. Pages are `noindex`.

```
NOIRE-Ecommerce/
├── assets/                  Original client logo (source of truth)
├── frontend/                React storefront + /admin dashboard (one SPA, admin lazy-loaded)
├── backend/                 Laravel REST API (/api/v1), migrations, seeders, tests
└── docs/                    architecture · api · database · demo-guide
```

## Requirements

- PHP 8.3+ with `pdo_mysql`, `gd`, `fileinfo` (Laravel Herd works)
- Composer 2, Node 20+ / npm
- MySQL 8+ running locally

## 1. Database (one-time)

The app uses its **own** database and a **least-privilege** user — never the MySQL root account.

1. Copy `backend/database/setup/create-database.example.sql` to `create-database.sql` and replace `CHANGE_ME` with a strong password.
2. Run it once as a MySQL administrator (you type the admin password yourself):

   ```powershell
   & "C:\Program Files\MySQL\MySQL Server 26.7\bin\mysql.exe" -u root -p -e "source backend/database/setup/create-database.sql"
   ```

   This creates only `noire_ecommerce` and `noire_ecommerce_test` and grants `noire_app` rights on those two databases. Other databases are untouched.

## 2. Backend

```powershell
cd backend
composer install
copy .env.example .env          # set DB_PASSWORD (and DEMO_ADMIN_PASSWORD)
php artisan key:generate
php artisan storage:link
php artisan migrate --seed      # schema + demo catalogue, orders and requests
php artisan serve               # http://127.0.0.1:8000
```

## 3. Frontend

```powershell
cd frontend
npm install
npm run dev                     # http://localhost:5173  (proxies /api, /sanctum, /storage to :8000)
```

Open **http://localhost:5173** for the store and **http://localhost:5173/admin** for the dashboard.
Admin credentials are the `DEMO_ADMIN_EMAIL` / `DEMO_ADMIN_PASSWORD` values in `backend/.env` (development only — never commit them). If the password is left blank, the seeder prints a generated one.

## Resetting the demo

- Command line: `php artisan noire:demo-reset` (refuses unless `DEMO_MODE=true`).
- Dashboard: **Settings → Demo → type RESET** (only when `DEMO_ALLOW_WEB_RESET=true`; admin-only, rate-limited, never public).

Changes made during a demo persist until you reset.

## Tests

```powershell
cd backend;  php artisan test     # PHPUnit feature tests on the isolated noire_ecommerce_test DB
cd frontend; npm test             # Vitest unit tests
cd frontend; npm run build        # type-check + production build
```

See [docs/demo-guide.md](docs/demo-guide.md) for the client walkthrough and the list of simulated integrations, and [docs/architecture.md](docs/architecture.md) for design decisions.
