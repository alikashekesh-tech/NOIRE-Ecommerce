# Architecture

## Topology

```
Browser ──► Vite dev server :5173 (React SPA: storefront + /admin)
              │  proxies /api, /sanctum, /storage
              ▼
            Laravel :8000  ──►  MySQL noire_ecommerce
            /api/v1 (REST)       (dedicated noire_app user)
```

The SPA, API and media share one origin (Vite proxy in development; a single domain or reverse proxy in production). This lets Laravel Sanctum use **cookie-based SPA authentication** with CSRF protection — no bearer tokens are kept in `localStorage`.

## Frontend (`frontend/`)

| Path | Purpose |
|---|---|
| `src/index.css` | Design tokens (`#FAF7F1` ivory, `#17181C` charcoal), Tailwind 4 theme, component classes, reduced-motion rules |
| `src/router.tsx` | Route table; every page except Home is code-split; `/admin/*` is a separate lazy chunk |
| `src/layouts/StoreLayout.tsx` | Announcement bar, sticky header + mega menu, mobile drawer, search, footer, bag drawer, WhatsApp button |
| `src/pages/*` | Storefront pages (Home, Shop/Collection, Product, Cart, Wishlist, Checkout, Confirmation, Custom design, content pages) |
| `src/admin/*` | Admin shell, login, and pages (Dashboard, Products, Product editor, Inventory, Orders, Customers, Requests, Homepage, Settings) |
| `src/services/api.ts` | Fetch wrapper: same-origin credentials, `XSRF-TOKEN` header, 419 retry, normalised validation errors |
| `src/services/queries.ts` | TanStack Query hooks (all product/price/stock data comes from the API) |
| `src/store/shop.ts` | Per-visitor conveniences in `localStorage`: bag lines (variant id + qty + personalisation), wishlist ids, remembered iPhone model, recently viewed |
| `src/lib/whatsapp.ts` | Template filling and `wa.me` link building; returns `null` (→ preview) when no business number is configured |

**Prices are never trusted from the browser.** The bag stores only variant ids and quantities; `POST /cart/quote` re-prices every line from MySQL, and checkout re-prices again inside a locked transaction.

## Backend (`backend/`)

| Path | Purpose |
|---|---|
| `routes/api.php` | Versioned `/api/v1`: public storefront, checkout, inquiries, and `admin/*` behind `auth:sanctum` + `admin` middleware |
| `app/Services/CatalogQuery.php` | Storefront filtering/sorting from URL params; facets |
| `app/Services/ProductPresenter.php` | Card/detail/variant JSON shapes |
| `app/Services/CartService.php` | Trusted quote: availability, shared-component stock, shipping options |
| `app/Services/OrderService.php` | Order placement (row locks, transaction), forward-only status flow, single restock on cancellation, simulated refunds |
| `app/Services/InventoryService.php` | Every stock change: row-locked, never negative, logged to `inventory_movements` |
| `app/Http/Requests/*` | Form Requests (checkout, cart items, product, variant) |
| `app/Http/Middleware/EnsureAdmin.php` | Role gate for `/admin` (roles listed in `User::ADMIN_ROLES`, ready for staff roles) |
| `app/Support/DemoArt.php` | Generates the clearly-labelled demo product renders (SVG) until real photography exists |
| `database/seeders/*` | Settings, catalogue (35 products), fictional customers, orders and custom requests |
| `routes/console.php` | `noire:demo-reset` (demo mode only) |

## Key decisions (demo assumptions)

- **Guest checkout only** for the MVP. Customer accounts, discount codes, advanced reports and shipping integrations were deferred by the client brief. The `users` table, roles and Sanctum are in place for adding them.
- **Bundles are products** (`type=bundle`) whose variants are composed of component variants (`bundle_items`). They hold no stock themselves; availability = the lowest component stock; checkout deducts components. Stock for a case bought alone *and* inside a set in the same order is checked together.
- **Inventory policy:** deduct at order placement; restore exactly once on cancellation (`orders.inventory_restored_at` guard). Status flow is forward-only: Pending → Confirmed → Preparing → Shipped → Delivered; Cancelled is terminal and not allowed after shipping.
- **Reporting definition:** revenue excludes cancelled orders.
- **Media:** public product media on Laravel's `public` disk under hashed names, served as root-relative `/storage/...` URLs. Custom-request reference images are stored on the private `local` disk and streamed only to admins.
- **Settings** (homepage content, WhatsApp, shipping, store info, policy pages) are JSON rows in `store_settings`, cached and invalidated on write.
- **SEO:** clean slugs, per-page titles/descriptions, breadcrumbs and Product JSON-LD (no ratings or reviews). The demo is `noindex` (`robots.txt` + meta); swap both for launch.
