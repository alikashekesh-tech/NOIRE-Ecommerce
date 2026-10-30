# Database (MySQL)

Database `noire_ecommerce` (tests use `noire_ecommerce_test`), user `noire_app` with privileges on those two schemas only. All money columns are `DECIMAL(10,2)`.

| Table | Notes |
|---|---|
| `users` | Admins and (future) customers; `role` (`admin`, `customer`), `is_active`, bcrypt passwords |
| `device_models` | iPhone 17 / 17 Pro / 17 Pro Max / 18 / 18 Pro / 18 Pro Max — editable, can be disabled or extended without code |
| `collections`, `collection_product` | Signature Cases, Handmade Creations, Matching Sets; ordering + publish flag |
| `products` | `type` case / power_bank / bundle, `status` draft / published / archived, merchandising flags, handmade production days, `specs` JSON, SEO fields, soft deletes |
| `product_variants` | Per device model + colour: unique `sku`, `price`, `compare_at_price`, `stock` (**unsigned** — cannot go negative), `low_stock_threshold`; `combination_key` + unique index stops duplicate model/colour combinations (NULL-safe) |
| `product_media` | Images (or video links), optional `color_name` so the gallery follows the selected colour, `is_primary`, order, alt text |
| `product_relations` | "Matching" links between cases, power banks and sets |
| `bundle_items` | Component variants (and quantities) of each bundle variant |
| `inventory_movements` | Every stock change with reason (seed, adjustment, order, cancellation), reference and resulting stock |
| `orders` | Fictional order number, private `access_token` for guest confirmation, customer + delivery snapshot, totals, simulated payment status/reference, `is_demo`, `inventory_restored_at` guard |
| `order_items` | Immutable snapshots (name, SKU, model, colour, price, image, personalisation, bundle components) — survive later product edits or deletion |
| `order_status_histories` | Every status change and simulated refund, with the acting admin |
| `custom_requests` | "Create Your Own" submissions, private reference image path, status, quotation, internal notes |
| `newsletter_subscriptions` | Demo opt-ins (nothing is sent) |
| `store_settings` | JSON key/value groups: `store`, `homepage`, `whatsapp`, `shipping`, `social`, `pages` |
| `sessions`, `cache`, `jobs`, `personal_access_tokens` | Laravel / Sanctum infrastructure |

Critical writes (checkout, stock adjustments, cancellations) run in transactions with `SELECT … FOR UPDATE` on the affected variants, locked in id order.

## Commands

```powershell
php artisan migrate --seed         # create schema and demo data
php artisan noire:demo-reset       # wipe + re-seed (DEMO_MODE=true only)
php artisan test                   # runs against noire_ecommerce_test
```
