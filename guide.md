# Thanka Treasure — Store Operator Guide

How to run your store end to end: set it up once, then use every feature — catalog,
orders, discounts, content, marketing, and in-store sales.

> This is the **operator** guide (how to *use* the platform). For architecture,
> data model, and provider-portability details, see
> [`thanka-treasure-implementation-guide.md`](./thanka-treasure-implementation-guide.md).

---

## 1. What you can do

The platform is three connected surfaces on one codebase:

- **Storefront** — the public shop your customers see: home, product catalog,
  collections, search, product pages (with optional decorative **frames**), cart,
  Stripe checkout, blog, CMS pages, contact, newsletter, and customer accounts.
- **Admin** (`/admin`) — your back office: products, variants, inventory, orders &
  fulfillment, discounts, frames, collections, customers, blog, pages, messages,
  subscribers, analytics, and store/branding settings.
- **POS** (`/pos`) — in-store point of sale: scan a barcode, take cash/card, and it
  records the order and decrements stock just like an online sale.

---

## 2. Get the store online (one-time setup)

Requires **Node + pnpm** and accounts with Supabase, Stripe, Resend, and (for
production) Upstash.

### 2.1 Install & configure

```bash
pnpm install
cp .env.example .env.local     # then fill in the values below
```

**Environment variables** (`.env.local`):

| Variable | What it's for | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Public base URL of the site | e.g. `https://yourshop.com` |
| `DATABASE_URL` | Pooled Postgres connection (app runtime) | Supabase → Project Settings → Database (pooler) |
| `DIRECT_DATABASE_URL` | Direct Postgres connection (migrations) | Supabase → Database (direct) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public (anon) key | Supabase → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin key (seed scripts, uploads) | Supabase → API → service role |
| `STRIPE_SECRET_KEY` | Server Stripe key | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Verifies incoming Stripe webhooks | Stripe → Webhooks → your endpoint |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client Stripe key (checkout UI) | Stripe → API keys |
| `STRIPE_AUTOMATIC_TAX` | `true`/`false` — Stripe auto tax | Requires a tax address set in Stripe → Settings → Tax |
| `SHIPPING_RATE_API_URL` / `_KEY` | Optional live carrier rates | Your carrier/rate provider (optional) |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | **Rate limiting.** If unset, rate limiting is OFF | Upstash → Redis → REST API |
| `RESEND_API_KEY` | Sends order/newsletter email | Resend → API Keys |
| `RESEND_FROM_EMAIL` | Verified sender address | Resend → Domains |
| `CRON_SECRET` | Protects `/api/health` detail | Any strong secret you choose |
| `ALERT_WEBHOOK_URL` | Where error alerts are posted | Slack/Discord/webhook (optional) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | WhatsApp contact button | Your number, digits only |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | First admin login | You choose (used by seed script) |

> ⚠️ **Rate limiting**: if `UPSTASH_REDIS_REST_URL`/`_TOKEN` are blank, the limiter
> silently allows every request. Set both in production or the security work on this
> branch does nothing.

### 2.2 Database, RLS, storage, admin

```bash
pnpm db:migrate          # apply Drizzle schema migrations
pnpm db:seed:storage     # create image/asset storage buckets
pnpm db:seed:admin       # create your admin login from ADMIN_* vars
```

> 🔒 **Critical — apply Row-Level Security.** RLS policies live in the
> `supabase/migrations/*.sql` files, **not** in the Drizzle migrations.
> `pnpm db:migrate` alone does **not** enable RLS. Apply those SQL files to your
> Supabase database (Supabase SQL editor or CLI) so customers can only read their
> own orders/addresses and only admins can write catalog data. Skipping this leaves
> tables exposed.

Verify the setup:

```bash
pnpm ops:verify:supabase   # checks Supabase project wiring
pnpm ops:verify:secrets    # checks required secrets are present
pnpm db:parity             # confirms Drizzle schema matches migrations
```

### 2.3 Connect Stripe & email

- **Stripe webhook**: in the Stripe dashboard add an endpoint pointing to
  `https://yourshop.com/api/webhooks/stripe`, subscribing to
  `checkout.session.completed`, `checkout.session.expired`,
  `checkout.session.async_payment_succeeded`, `...async_payment_failed`,
  `charge.refunded`, and `charge.dispute.created`. Copy its signing secret into
  `STRIPE_WEBHOOK_SECRET`. This webhook is what actually **creates the order** and
  sends the confirmation email after payment.
- **Resend**: verify your sending domain in Resend and set `RESEND_FROM_EMAIL` to an
  address on that domain, or emails won't deliver.

### 2.4 Run it

```bash
pnpm dev                     # local development at http://localhost:3000
# production:
pnpm build && pnpm start
```

---

## 3. Sign in to admin

Go to `/auth/login` and sign in with the admin you seeded. You land on `/admin`.
Route protection (`proxy.ts`) enforces:

- `/admin/*` requires an **admin** account (non-admins are redirected to the home page).
- `/account/*` requires any signed-in customer.
- Signed-in users are bounced away from `/auth/*`.

Sign out from the admin menu (runs `adminSignOutAction`).

---

## 4. Make the store yours (settings)

| Task | Where | What you set |
|---|---|---|
| **Branding** | `/admin/settings/branding` | Brand name, tagline, light/dark logos, color palette (ink/paper/saffron/gold), body & display fonts. Colors apply site-wide via CSS variables at runtime. |
| **Store settings** | `/admin/settings` | Support/secondary email, phone, WhatsApp, address, Instagram/Facebook, and the storefront announcement-bar messages. |
| **Barcode settings** | `/admin/settings/barcode` | Barcode symbology/format defaults used on product barcodes and POS. |

---

## 5. Build your catalog

Recommended order:

1. **Categories** — `/admin/products/categories`. Create categories (hierarchical,
   with parent/child) and **collections** (manual = you pick products, or automated =
   rule-based). Assign products to collections here too.
2. **Attributes** — `/admin/products/attributes`. Define reusable product attributes
   (e.g. Size, Material, Origin) with a type, options, unit, and whether they're
   filterable / shown on the storefront.
3. **Create a product** — `/admin/products/new`:
   - Title, slug, description (rich text), SEO meta, vendor, tags, category, status
     (**draft / active / archived** — only *active* shows on the storefront).
   - **Variants**: each with its own SKU (unique) and **price in cents** (e.g. `4999`
     = $49.99), optional compare-at price, weight, and up to 3 option values.
   - **Images**: upload, reorder, edit alt text, set per-variant images.
   - **Attribute values**: fill in the attributes you defined.
4. **Inventory** — `/admin/products/inventory`. Set on-hand quantity and low-stock
   threshold per variant (single or batch). Stock is reserved during checkout and
   committed when payment succeeds.
5. **Barcodes** — `/admin/products/[id]/barcode` renders/prints a scannable barcode;
   regenerate from the product actions if needed. Used by POS and stock workflows.
6. **Frames (add-ons)** — `/admin/frames`. Frames are optional decorative overlays a
   customer can add on a product page. Each frame has a name, image, a **price delta**
   (added to the item price), and cutout geometry (`x/y/width/height`) that positions
   the artwork inside the frame preview. Attach frames to products and mark a default.
7. **Bulk import** — `/admin/products/import`. Upload a CSV to create many products at
   once (parsed with PapaParse).

---

## 6. Discounts

`/admin/discounts/new`:

- **Code** (customer types it at checkout) or **automatic** (best matching discount
  applied for them).
- Type: **percentage**, **fixed amount**, or **free shipping**.
- Optional minimum order amount, usage limit, and a start/end schedule.
- Toggle active/inactive from the list. At checkout, an entered code is validated; if
  none is entered, the best eligible automatic discount is applied and converted to a
  one-time Stripe coupon.

---

## 7. The customer journey (storefront)

1. **Browse** — `/products` (catalog with filters), `/collections/[slug]` (curated),
   `/search`. Prices display in the visitor's currency (converted from USD).
2. **Product page** — `/products/[slug]`: images, pick a **variant**, optionally add a
   **frame** (price updates by the frame's delta), then Add to cart.
3. **Cart** — a slide-out drawer (client-side; no login required to add).
4. **Checkout** — `/checkout`: embedded Stripe payment. Shipping options are chosen by
   the visitor's country (detected from IP; ~17 supported, default US) — either live
   carrier rates or the built-in "Free International" ($0, 7–14 days) and "Express
   International" ($25, 2–5 days). Tax is applied if `STRIPE_AUTOMATIC_TAX=true`.
5. **Stock hold** — placing the order **reserves inventory for 30 minutes**. If the
   customer abandons, the reservation auto-releases (`checkout.session.expired`).
6. **Success** — `/checkout/success` confirms the order; the Stripe webhook creates the
   order record, commits inventory, and emails an order confirmation. Cancelled
   payments land on `/checkout/cancel`.

---

## 8. Orders & fulfillment

`/admin/orders` → open one at `/admin/orders/[id]`. Order numbers look like
`TT-YYYYMMDD-NNNNNN`.

- Update **order status** (pending → … → delivered/cancelled), **payment status**, and
  **fulfillment status**.
- Add internal **notes** (audit-tracked in `order_events`).
- Marking an order **shipped** sends the customer a shipped email.
- **Refunds** are requested from the order and processed through Stripe; the
  `charge.refunded` webhook reconciles the record. Disputes are captured too.

Orders also carry a **source** (`online` vs POS) and payment method.

---

## 9. Customers & accounts

- Customers sign up at `/auth/signup` (and reset via `/auth/reset-password`).
- Signed-in customers get `/account` (profile), `/account/orders` (history), and
  `/account/addresses` (saved shipping/billing).
- Admin view: `/admin/customers` lists customers with order totals and lifetime spend.

---

## 10. In-store sales (POS)

`/pos` (also linked from `/admin/pos`):

- Look up a product by **barcode or SKU**, or search by name.
- Add items to the sale, choose **cash / card / other**, and complete it.
- Completing a sale creates an order (source = POS) and **decrements inventory** — the
  same stock pool as online, so you never oversell across channels.

---

## 11. Content (blog & pages)

- **Blog** — `/admin/blog` (new at `/admin/blog/new`). Rich-text editor (TipTap),
  featured image, SEO fields, and status **draft / published / scheduled** (scheduled
  posts publish at their time). Manage taxonomy at `/admin/blog/categories` (categories
  and tags). Posts appear at `/blogs` and `/blogs/[slug]`; view counts are tracked.
- **Static pages (CMS)** — `/admin/pages` (new at `/admin/pages/new`). Same rich-text
  editor for About, policies, FAQs, etc. Published pages render at `/pages/[slug]`.

> Rich-text content authored here is sanitized before it renders on the storefront, so
> stick to the editor's formatting (headings, lists, links, images, bold/italic) —
> raw `<script>` and unsafe attributes are stripped.

---

## 12. Marketing

- **Subscribers / newsletter** — `/admin/subscribers`: add subscribers manually, change
  their status, **export CSV**, and **send a newsletter campaign** (rendered with React
  Email, delivered via Resend). Customers subscribe from the footer or `/newsletter`.
- **Messages (contact inbox)** — `/admin/messages`: submissions from the storefront
  `/contact` form land here; set status (new/read/replied/archived) and add notes.

---

## 13. Dashboard & analytics

- `/admin` — headline metrics at a glance.
- `/admin/analytics` — sales/traffic reports.

---

## 14. Go-live checklist

- [ ] Production env vars set — **Upstash configured so rate limiting is ON**, Stripe
      **live** keys, and the Stripe **webhook** endpoint added + secret set.
- [ ] `RESEND_FROM_EMAIL` on a **verified** Resend domain (test an order email).
- [ ] **RLS applied** from `supabase/migrations/*.sql` (not just `db:migrate`).
- [ ] `pnpm db:seed:storage` and `pnpm db:seed:admin` run against production.
- [ ] `pnpm ops:verify:supabase` and `pnpm ops:verify:secrets` pass.
- [ ] `/api/health` returns healthy (detail gated by `CRON_SECRET`).
- [ ] `ALERT_WEBHOOK_URL` set so errors are surfaced.
- [ ] `pnpm build` is clean (strict TypeScript + lint enforced).
- [ ] Security response headers present (HSTS, X-Frame-Options, etc. — set in
      `next.config.ts`).
- [ ] Do a **real test purchase** end to end (browse → frame → checkout → webhook →
      order + email → fulfill → refund).
- [ ] *(Follow-up)* Add a Content-Security-Policy — deferred because it must be tested
      against Stripe Elements; the other security headers are already in place.

---

## 15. Ops & troubleshooting

| Need | Do this |
|---|---|
| Health check | `GET /api/health` (add `CRON_SECRET` auth for detail) |
| Verify Supabase wiring | `pnpm ops:verify:supabase` |
| Verify secrets present | `pnpm ops:verify:secrets` |
| Schema drift | `pnpm db:parity` |
| Inspect data | `pnpm db:studio` |
| Errors / alerts | Logged via the monitoring layer; posted to `ALERT_WEBHOOK_URL` |
| Where images live | Supabase Storage buckets (`product-images`, `blog-images`, `site-assets`, `private-assets`); Cloudflare R2 is the planned production target |

**Common issues**

- *Rate limiting isn't working* → `UPSTASH_*` vars are missing; the limiter no-ops when
  unset.
- *Checkout fails on tax* → `STRIPE_AUTOMATIC_TAX=true` without a tax address in Stripe.
  Set the address or use `false`.
- *Order didn't appear after payment* → the Stripe webhook isn't reaching
  `/api/webhooks/stripe` or `STRIPE_WEBHOOK_SECRET` is wrong.
- *Customer can see data they shouldn't / admin writes fail* → RLS wasn't applied from
  the Supabase SQL migrations.
- *Emails not sending* → Resend domain not verified or `RESEND_FROM_EMAIL` off-domain.
