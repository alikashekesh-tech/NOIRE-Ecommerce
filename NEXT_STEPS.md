# NOIRÉ — Next Steps (handoff, 2026-10-30)

Project: `C:\Users\alika\NOIRE-Ecommerce` · React 19 + Vite 8 + Tailwind 4 (`frontend/`) · Laravel 13 + Sanctum (`backend/`) · MySQL 26.7 (isolated instance on **127.0.0.1:3307**).
Read `README.md` and `docs/` (architecture, api, database) for structure.

---

## 1. Completed and tested

**Infrastructure**
- Isolated MySQL instance for NOIRÉ only: data + `my.ini` in `.mysql-noire/` (git-ignored), port 3307, bound to 127.0.0.1, no Windows service. The original `MySQL267` service on 3306 and other projects (DMD World, Made in Global) were not touched.
- Databases `noire_ecommerce` (demo) and `noire_ecommerce_test` (automated tests). App user `noire_app` has rights on those two only. All credentials live only in git-ignored `backend/.env` (`DB_PASSWORD`, `NOIRE_MYSQL_ROOT_PASSWORD`, `DEMO_ADMIN_PASSWORD`).
- Demo data: 36 products (24 cases incl. 9 handmade, 6 power banks, 6 matching sets), 304 variants, generated demo artwork (SVG), 14+ demo orders, 4 custom requests, 1 admin.

**Storefront (all verified in the browser)**
- Homepage: announcement, hero, Shop by iPhone Model, collections, best sellers, Complete the Look, handmade story, new arrivals, newsletter, footer.
- Shop / collection pages with URL filters (model, collection, type, colour, price, material, handmade, stock, new, matching), sorting, pagination, mobile filter drawer, remembered iPhone model.
- Product page: dynamic model/colour variants (price, stock, SKU, images update), personalisation for customisable items, bundle components + savings, WhatsApp "Ask About This Product" (preview mode while no number is set), full-screen lightbox (keys, swipe, thumbnails, click-zoom), mobile thumbnails, sticky mobile add bar.
- Product cards: interactive colour swatches (32px targets, ring selection, desktop tooltip, subtle colour-name line, keyboard arrows), colour carried to product page via `?color=`, sold-out colours previewable but never purchasable, "Sold out" badge only when no variant is purchasable. Subtle 1.015 hover, pointer devices only.
- Bag drawer + page (server-priced), wishlist (local), simulated checkout (Demo COD / "Simulate Successful Payment"), order confirmation by private token, custom-design request form with private image upload.
- Admin: login, dashboard + 30-day chart, products (create/edit/publish/duplicate/delete), variant generator + inline editing, bundle components, media upload/reorder/primary/alt, inventory with movement log, orders (forward-only status, notes, simulated refunds), customers, custom requests (status/quote/notes), homepage content, settings (store, WhatsApp, shipping, device models, collections, social/pages), demo reset.

**Automated test results (last run in this session)**
- Backend `php artisan test`: **33 passed** (193 assertions) on `noire_ecommerce_test`.
- Frontend `npm test` (Vitest): **9 passed**.
- `npm run build`: succeeds.
- Playwright storefront (`e2e/storefront.spec.ts`, against :5173): all 21 tests passed across the final runs (journey + checkout, WhatsApp message content, mobile menu/filters, swatches incl. Marble & Pearl at 1440px and 390px, partial sold-out fixture, lightbox, mobile thumbnails, nav active state/header, no horizontal overflow at 320–1920px). The last full-suite run had 3 overflow failures at 375–430px; those were fixed and re-run green in the targeted run.

**Bugs fixed in the last rounds (root causes)**
- Admin login logo stretched → flex `align-items: stretch`; Logo now width-sized with automatic height.
- Tall nav focus rectangle / double active links → link padding filled header height; NavLink ignored query strings.
- Marble swatches "not working" → card hover image was the *other colour's* photo and overlaid the card on hover. Hover image now only same-colour alternate views, limited to the image area.
- Pearl red cursor → sold-out swatches were `disabled` buttons with `cursor: not-allowed`. Pearl is genuinely sold out (Pearl Power Bank stock 0 in both colours), so the label is correct.
- Overflow at 320–430px → footer grid min-content, Add-to-Bag price text, swatch tooltips.

## 2. Remaining bugs / unfinished

1. **Isolated admin Playwright run incomplete.** `e2e/admin.spec.ts` was expanded (auth, dashboard, nav, product create→variants→image→publish→storefront, price edit, inventory, orders, requests, homepage, settings/WhatsApp). On the isolated stack (:8001 API on the test DB + :5174 Vite) test 1 passed; **test 2 failed at sign-in** (Dashboard heading never appeared). Not yet diagnosed. Likely causes to check: `admin@noire.test` / `test-password-123` not present in the test DB at that moment (PHPUnit re-seeds it each run), the Sanctum stateful domain for :5174, or session cookie sharing with :5173 on `localhost`. *Admin features were verified by the 33 backend API tests and by earlier manual/browser checks, but the full admin UI walkthrough has not passed end-to-end yet.*
2. **Customer registration not implemented.** Only the libraries are installed (`libphonenumber-js`, `country-flag-icons` in frontend; `giggsey/libphonenumber-for-php-lite` in backend). Plan: migration (unique `phone`, nullable `email`, `phone_verified_at` stays null, no SMS), `/api/v1/auth/{register,login,logout,me,orders}` on the existing Sanctum session, searchable country picker (default 🇱🇧 +961, E.164 storage), Register / Sign In / Account pages, redirect back to checkout, header user icon → `/account`.
3. Mobile product page: the WhatsApp floating button overlaps the edge of the wishlist heart.
4. Pending demo-art refresh: softer leather grain on light colours and the corrected power-bank shadow are in code (`backend/app/Support/DemoArt.php`) but only appear after a demo reset. Not applied, because the main DB must not be reset without permission.
5. Wishlist is per-device (localStorage). Account sync comes with registration.
6. Lighthouse audit not run.

## 3. Pending premium design refinements (from the final master brief — not started)

- **Shop by iPhone Model:** less whitespace, refined cards with subtle phone silhouettes, clearer selected state (charcoal border + subtle fill + indicator), better number/sublabel typography.
- **Header logo:** remove the mouse-click outline on the logo link (keep `:focus-visible` ring).
- **Matching-set artwork:** balance case/power-bank scale, lighting and shadows (`DemoArt::bundleImage`, needs a demo reset to regenerate, so ask first).
- **Product cards:** verify equal heights and alignment of name/price/swatches across grids.
- **Product detail:** spacing audit desktop/mobile; keep WhatsApp clear of wishlist and sticky bar.
- **Custom-design page:** validation-state styling, upload control polish.
- **Cart / wishlist / checkout:** spacing and typography pass.
- **Admin:** consistency pass (headings, tables, empty states, feedback toasts).
- **QA:** before/after screenshots at 320/375/390/430/768/1024/1440.

## 4. Restart commands (PowerShell)

```powershell
# 1) MySQL (isolated NOIRÉ instance, port 3307)
cd C:\Users\alika\NOIRE-Ecommerce
.\scripts\db-start.ps1            # stop later with .\scripts\db-stop.ps1

# 2) Laravel API (port 8000)
cd C:\Users\alika\NOIRE-Ecommerce\backend
php artisan serve --host=127.0.0.1 --port=8000

# 3) React storefront + admin (port 5173, proxies /api /sanctum /storage to :8000)
cd C:\Users\alika\NOIRE-Ecommerce\frontend
npm run dev
```

- Storefront: http://localhost:5173 · Admin: http://localhost:5173/admin
- Admin login: `admin@noire.demo`. The password is `DEMO_ADMIN_PASSWORD` in `backend/.env` (development only; it matched the stored hash when last checked).

**Tests**
```powershell
cd backend;  php artisan test                     # isolated noire_ecommerce_test DB
cd frontend; npm test; npm run build
cd frontend; npx playwright test e2e/storefront.spec.ts   # needs the 3 servers above (uses installed Edge)
```

**Isolated admin E2E stack (does NOT touch the demo DB)**
```powershell
# terminal A — API on the test DB
cd backend; $env:DB_DATABASE='noire_ecommerce_test'; $env:CACHE_STORE='array'; $env:SANCTUM_STATEFUL_DOMAINS='localhost:5174,127.0.0.1:5174'; php artisan serve --port=8001
# terminal B — Vite pointed at it
cd frontend; $env:VITE_BACKEND_URL='http://127.0.0.1:8001'; npx vite --port 5174 --strictPort
# terminal C
cd frontend; $env:E2E_BASE_URL='http://localhost:5174'; $env:E2E_ADMIN_EMAIL='admin@noire.test'; $env:E2E_ADMIN_PASSWORD='test-password-123'; npx playwright test e2e/admin.spec.ts
```
(Run `php artisan test` first to re-seed the test DB, then `DB_DATABASE=noire_ecommerce_test php artisan db:seed --class=DemoOrdersSeeder` for demo orders.)

## 5. Continuing in a new Claude Code session

1. Open `C:\Users\alika\NOIRE-Ecommerce` in VS Code and start the three servers (section 4).
2. Start the session with something like:
   > "Read `NEXT_STEPS.md`, `README.md` and `docs/architecture.md` in this project. Continue NOIRÉ from section 2 item 1 (diagnose the isolated admin E2E sign-in failure), then the design refinements in section 3, then customer registration. Do not reset the main demo database; use the isolated test stack for write tests."
3. Constraints to restate: keep colours `#FAF7F1` / `#17181C`, keep the original logo (width-sized via `<Logo className="w-[..]" />`), MySQL only (no SQLite), never use the 3306 root account, never reset `noire_ecommerce` without asking.
4. Helpful scripts: `frontend/e2e/shots.mjs` (screenshots; `PAGES="name=/path,..."`), `frontend/e2e/overflow.mjs <path> <width>` (finds overflowing elements), `frontend/e2e/swatch-debug.mjs`.
5. A local git snapshot was created (see `git log`). `.env` files and `.mysql-noire/` are ignored and are NOT in git, so back up `backend/.env` and `.mysql-noire/` separately if needed.
