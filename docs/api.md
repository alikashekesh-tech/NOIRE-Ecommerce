# REST API — `/api/v1`

JSON in, JSON out. Validation errors return `422` with `{ message, errors: { field: [..] } }`. Mutating requests from the SPA need the Sanctum CSRF cookie (`GET /sanctum/csrf-cookie`) and the `X-XSRF-TOKEN` header — `src/services/api.ts` handles this.

## Public

| Method | Path | Description |
|---|---|---|
| GET | `/storefront/settings` | Demo flag, announcement, WhatsApp config, shipping summary, device models, collections, page list |
| GET | `/storefront/home` | Hero, sections, collections, best sellers, new arrivals, featured, complete-the-look bundle |
| GET | `/pages/{slug}` | Policy/content page |
| GET | `/products` | Filters: `q`, `model`, `collection`, `type`, `color`, `material`, `min_price`, `max_price`, `handmade`, `in_stock`, `new`, `matching`, `limited`, `bestseller`, `ids`; `sort` = featured · newest · price_asc · price_desc · name; `page`, `per_page`; `facets=1` |
| GET | `/products/{slug}` | Detail with variants, media, matching items and related products |
| GET | `/collections/{slug}` | Collection header + SEO |
| POST | `/cart/quote` | `{ items: [{variant_id, quantity, customization?}], shipping_method? }` → trusted lines, issues, totals, shipping options |
| POST | `/checkout` | Customer + delivery fields, `items`, `shipping_method`, `payment_method` (`demo_cod`/`demo_card`), `simulate_payment` (required for card) → `{ number, token }` · throttled |
| GET | `/orders/{number}?token=` | Guest confirmation (requires private token) |
| POST | `/custom-requests` | Multipart; optional `reference_image` (jpg/png/webp ≤ 5 MB, stored privately) · throttled |
| POST | `/newsletter` | Stores opt-in only · throttled |

## Admin (`auth:sanctum` + `admin` role)

| Method | Path | Description |
|---|---|---|
| POST | `/admin/login` · `/admin/logout` · GET `/admin/me` | Session auth (login throttled 5/min) |
| GET | `/admin/dashboard` | Demo totals, 30-day revenue, status breakdown, recent orders, best sellers, popular models, low stock |
| GET/POST | `/admin/products` | List (q, status, type, collection) / create |
| GET/PUT/DELETE | `/admin/products/{id}` | Detail / update / soft delete (archives) |
| POST | `/admin/products/{id}/duplicate` | Copy as draft (new SKUs, zero stock) |
| POST | `/admin/products/{id}/variants` · PUT/DELETE `/admin/variants/{id}` | Variant CRUD; duplicate SKU or model+colour rejected |
| PUT | `/admin/variants/{id}/components` | Bundle components |
| POST | `/admin/products/{id}/media` · PUT `/admin/products/{id}/media/order` · PUT/DELETE `/admin/media/{id}` | Upload (jpg/png/webp, ≥400 px, ≤8 MB), reorder, alt/colour/primary, delete |
| GET | `/admin/inventory` · POST `/admin/inventory/{variant}/adjust` · GET `/admin/inventory/movements` | Stock list, set/change, history |
| GET | `/admin/orders` · `/admin/orders/{id}` | List / detail with history |
| PUT | `/admin/orders/{id}/status` · `/admin/orders/{id}/notes` · POST `/admin/orders/{id}/refund` | Forward-only status, internal notes, simulated refund |
| GET | `/admin/customers` | Customers grouped from orders |
| GET/PUT | `/admin/custom-requests` · `/admin/custom-requests/{id}` · GET `…/{id}/image` | Review, quote, notes, private image |
| GET/POST | `/admin/collections` · POST `/admin/collections/{id}` | Collections (multipart image) |
| GET/POST/PUT | `/admin/device-models` | iPhone models |
| GET | `/admin/variant-search?q=` | Picker for bundle components |
| GET/PUT | `/admin/settings` · `/admin/settings/{store,whatsapp,shipping,social,homepage,pages}` | Settings groups (validated per group) |
| POST | `/admin/settings/hero-image` | Homepage image upload |
| POST | `/admin/demo/reset` | `{ confirm: "RESET" }`, demo mode + `DEMO_ALLOW_WEB_RESET` only, throttled |
