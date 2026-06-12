# Thanka Treasure — E-Commerce Platform Implementation Guide

**Stack:** Next.js 16+ (App Router) · Drizzle ORM · Supabase (Postgres + Auth + Storage, behind interfaces) · Stripe · Vercel
**Architecture:** Shopify-grade admin dashboard + customer storefront — single codebase
**Reference site:** [thankatreasure.com](https://thankatreasure.com) (currently on Shopify — rebuilding from scratch)
**Design direction:** Maroon & white palette — peaceful, spiritual, gallery-like aesthetic

---

## Portability Strategy — Read This First

Supabase is the backend today (Postgres, Auth, Storage), but **no app code imports `@supabase/*` directly**. Every Supabase capability sits behind an interface. Swapping providers later means writing one new file per layer and changing one import — not a rewrite.

### The four layers and their seams

| Layer                 | Interface                          | Today's Impl                    | Tomorrow's Options                                                            |
| --------------------- | ---------------------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| **Database queries**  | Drizzle ORM + Repository functions | `postgres.js` → Supabase pooler | Neon, Railway, RDS, Fly Postgres, self-hosted — change connection string only |
| **Auth**              | `AuthProvider` interface           | `SupabaseAuthProvider`          | Better Auth, Auth.js, Clerk — write new provider class                        |
| **Storage**           | `StorageProvider` interface        | `SupabaseStorageProvider` (dev) → **Cloudflare R2 (production)** | R2 is the planned production target — zero egress fees, S3-compatible API. S3, GCS, B2 remain viable alternatives. |
| **Realtime** (future) | `RealtimeProvider` interface       | (not in MVP)                    | Pusher, Ably, self-hosted                                                     |

### The non-negotiable rules

These rules are what make the abstraction actually portable. Break any one of them and the seam leaks.

1. **App code never imports from `@supabase/*`.** Only files inside `src/lib/auth/providers/` and `src/lib/storage/providers/` may import Supabase SDKs. Everything else imports from `src/db`, `src/lib/auth`, `src/lib/storage`.
2. **All database queries go through Drizzle, never the Supabase JS client.** No `.from('products').select()` anywhere.
3. **All queries live in repository functions** (`src/db/repositories/*.ts`). Server actions and route handlers call repositories — they never call Drizzle directly. This is the seam where authorization checks live.
4. **Authorization is in repository functions, not only in RLS.** RLS stays enabled on Supabase as defense-in-depth (free safety net), but the repository layer is the contract. RLS is a bonus that disappears the day you leave Supabase; the repos travel with you.
5. **File URLs are never stored in the database.** Store `{bucket, path}` instead. A `resolveUrl(bucket, path)` helper builds the public URL at read time. Storing full `https://xyz.supabase.co/storage/...` URLs would mean a DB rewrite on storage migration; storing bucket+path means swapping the provider class is enough.
6. **User IDs in `profiles` mirror the auth provider's user ID via a single column.** A future auth migration rewrites that one column instead of every foreign key.
7. **Enforce rule 1 with a lint rule.** ESLint `no-restricted-imports` blocks `@supabase/*` outside the two provider folders. Code review is not enough — add the rule on day one.

### What stays Supabase-specific (acceptable lock-in)

- The SQL inside `SupabaseAuthProvider` and `SupabaseStorageProvider` themselves.
- RLS policies (defense-in-depth only — duplicated by repository checks).
- The connection string format and pooler URL.

Everything else is portable.

---

## Package Versions (Latest as of April 2026)

| Package                        | Latest Version | Notes                                                                                                                     |
| ------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `next`                         | **16.2.2**     | Upgraded from 14+. `headers()`, `cookies()`, `params` are now async. Caching opt-in by default.                           |
| `tailwindcss`                  | **4.2.2**      | Major rewrite — CSS-first config. No more `tailwind.config.ts`. Use `@import "tailwindcss"` in CSS.                       |
| `drizzle-orm`                  | **0.44.6**     | TypeScript ORM. Connects to any Postgres via `postgres.js` or `node-postgres`.                                            |
| `drizzle-kit`                  | **0.31.4**     | Migration generator and studio. Source of truth for schema changes.                                                       |
| `postgres`                     | **3.4.7**      | Postgres.js — fast, modern Postgres client. Used by Drizzle to connect to Supabase pooler.                                |
| `@supabase/supabase-js`        | **2.101.1**    | Used **only** inside `src/lib/auth/providers/supabase.ts` and `src/lib/storage/providers/supabase.ts`. Node 20+ required. |
| `@supabase/ssr`                | **0.10.0**     | Used **only** inside the auth provider for cookie-based session handling.                                                 |
| `stripe`                       | **22.0.0**     | Pinned to API `2026-03-25.dahlia`. Breaking: `decimal_string` fields now use `Stripe.Decimal` type.                       |
| `@stripe/stripe-js`            | **9.1.0**      | Use with `@stripe/react-stripe-js` for Embedded Checkout (recommended over hosted redirect in 2026).                      |
| `zustand`                      | **5.0.12**     | Minor API changes from v4 — `useStore` hook removed in favour of direct store usage.                                      |
| `react-hook-form`              | **7.72.1**     | Stable — no breaking changes from 7.x series.                                                                             |
| `zod`                          | **4.3.6**      | Major version — some API changes from v3. Review migration guide before upgrading.                                        |
| `@hookform/resolvers`          | **5.2.2**      | Compatible with Zod v4 and React Hook Form 7.x.                                                                           |
| `@tiptap/react`                | **3.22.2**     | Major version from v2 — extension APIs updated. Review Tiptap v3 migration guide.                                         |
| `@tiptap/starter-kit`          | **3.22.2**     | Matches `@tiptap/react` version — always keep in sync.                                                                    |
| `date-fns`                     | **4.1.0**      | Major version — tree-shaking improved; some function signatures changed from v3.                                          |
| `slugify`                      | **1.6.9**      | No breaking changes.                                                                                                      |
| `resend`                       | **6.10.0**     | Major version — SDK restructured. `new Resend(apiKey)` API unchanged, but some method paths changed.                      |
| `@react-email/components`      | **1.0.11**     | Stable.                                                                                                                   |
| `@fontsource/playfair-display` | **5.2.8**      | Stable.                                                                                                                   |
| `@fontsource/inter`            | **5.2.8**      | Stable.                                                                                                                   |
| `@fontsource/lora`             | **5.2.8**      | Stable.                                                                                                                   |

> **⚠️ Critical version notes:**
>
> - **Drizzle + postgres.js**: Connect to Supabase via the pooler URL (port 6543, transaction mode) for serverless-safe pooling. The direct connection (port 5432) is for migrations only.
> - **Tailwind v4** is a full rewrite. Configuration moves entirely into CSS (`@import "tailwindcss"` + `@theme` block). No `tailwind.config.ts` needed for basic setups. shadcn/ui has a Tailwind v4-compatible release.
> - **Next.js 15+** changed default caching to opt-in. ISR is still supported via `export const revalidate = N` but `fetch()` is no longer cached by default.
> - **Stripe v22** is a major release — the `Stripe.Decimal` type change is breaking for any code reading `decimal_string` fields as plain strings.
> - **Zod v4** has a migration guide at [zod.dev](https://zod.dev) — some refinement and transform APIs changed.
> - **Node.js requirement**: Use Node 20+ (Node 18 reached EOL April 2025).

---

## Progress Tracker

Legend: ✅ Complete · 🟨 In Progress · ⬜ Not Started

### Phase 1 — Foundation & Infrastructure

| #    | Task                                       | Status | Notes                                                                                                                                                                                                                                                                  |
| ---- | ------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1  | Project scaffolding & folder structure     | ✅     | Route groups and base architecture scaffolded                                                                                                                                                                                                                          |
| 1.2  | Supabase project creation & configuration  | ✅     | Added Supabase foundation migration (`supabase/migrations/20260407100000_foundation_schema.sql`) plus an automated setup verifier (`pnpm ops:verify:supabase`) that validates required env wiring and probes both pooler/direct database connectivity                  |
| 1.3  | Drizzle setup + database schema (core)     | ✅     | Drizzle dependencies/config + core schema modules (profiles/products/orders/marketing) added with initial migration and committed parity validation workflow (`pnpm db:parity`) that compares current schema snapshots against the latest committed migration snapshot |
| 1.4  | Drizzle schema — blog tables               | ✅     | Blog schema modules (`blog_posts`, taxonomies, static pages, settings) implemented in Drizzle                                                                                                                                                                          |
| 1.5  | Repository layer + RLS (defense-in-depth)  | ✅     | Added shared repository authz guards (`requireAdminSession`) and enforced admin checks across analytics/products/blog/collections/orders/contact/newsletter/inventory/discounts/pages/settings admin methods for defense-in-depth parity with RLS                      |
| 1.6  | Auth provider interface + Supabase impl    | ✅     | `AuthProvider` + `SupabaseAuthProvider` implemented and exported via `lib/auth`                                                                                                                                                                                        |
| 1.7  | Admin middleware & route protection        | ✅     | `proxy.ts` now reads sessions through `lib/auth` abstraction                                                                                                                                                                                                           |
| 1.8  | Environment variables & secrets management | ✅     | Added secret rollout validator (`pnpm ops:verify:secrets`) with required-variable coverage and format checks (Stripe/API/webhook/URLs/email) and documented verification flow in README + deployment env docs                                                          |
| 1.9  | Storage provider interface + Supabase impl | ✅     | `StorageProvider` + `SupabaseStorageProvider` implemented; upload route uses storage abstraction                                                                                                                                                                       |
| 1.10 | Design system — maroon/white theme tokens  | ✅     | Tailwind v4 `@theme` tokens implemented                                                                                                                                                                                                                                |

### Phase 2 — Admin Dashboard (Core)

| #    | Task                                               | Status | Notes                                                                                                                                                                                                                                  |
| ---- | -------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | Admin layout — sidebar, topbar, breadcrumbs        | ✅     | Sidebar/topbar layout scaffolded                                                                                                                                                                                                       |
| 2.2  | Product CRUD — create, edit, list, archive         | ✅     | Admin products now support repository-backed create/edit/archive workflows with server-action validation, primary variant pricing, and inventory threshold updates                                                                     |
| 2.3  | Product variants — size/color/SKU builder          | ✅     | Admin products now support a repository-backed multi-variant builder (size/color/options, SKU, pricing, and per-variant inventory thresholds) across create/edit workflows via validated server actions                                |
| 2.4  | Product image management — upload, reorder, delete | ✅     | Admin product edit now supports storage-backed image uploads, variant assignment + alt text metadata updates, position reordering (up/down), and deletion with cache revalidation for admin/storefront product routes                  |
| 2.5  | Category & collection management                   | ✅     | Added `/admin/products/categories` taxonomy console with repository-backed category CRUD, collection CRUD, and manual collection product assignment management, plus navigation links from products list and admin sidebar             |
| 2.6  | Rich text editor for product descriptions          | ✅     | Admin product forms now use a TipTap-based rich text editor (StarterKit toolbar with formatting/list/heading/blockquote controls) that submits HTML content through existing server-action validation and repository save flows        |
| 2.7  | Inventory tracking per variant                     | ✅     | Added `/admin/products/inventory` with repository-backed per-variant stock visibility (on-hand, reserved, available, low-stock status) and inline quantity/threshold updates via validated admin server actions                        |
| 2.8  | SEO fields — meta title, description, slug         | ✅     | Product admin create/edit now supports validated meta title and meta description fields alongside slug controls, and storefront product metadata generation now prefers saved SEO fields with safe content fallbacks.                  |
| 2.9  | Blog management — create, edit, publish, schedule  | ✅     | Admin blog create/edit now includes a TipTap rich editor with inline image uploads, featured image management, and validated draft/published/scheduled workflows backed by repository persistence and cron-based scheduled publishing. |
| 2.10 | Blog categories & tags management                  | ✅     | Admin taxonomy manager now supports repository-backed create/edit workflows for categories and tags, and blog create/edit forms can assign multiple categories/tags via validated server actions                                       |
| 2.11 | Blog media — featured image & inline images        | ✅     | Blog admin now supports featured image upload/replace/remove with alt text plus inline editor image uploads via `/api/upload`, and storefront/blog metadata surfaces consume stored media references through the storage abstraction.  |
| 2.12 | Contact form submissions viewer                    | ✅     | Admin messages now include full submission listing, status workflow (`new/read/replied/archived`), internal notes, summary stats, and sidebar unread badge via `contactRepository`                                                     |
| 2.13 | Newsletter subscriber management                   | ✅     | Admin subscribers now support listing + stats, manual add, activate/unsubscribe actions, CSV export endpoint, and sidebar active-subscriber badge via `newsletterRepository`                                                           |
| 2.14 | Static pages editor (About, Shipping Policy, etc.) | ✅     | Admin static pages now have repository-backed list/create/edit workflows with slug generation, status controls, and SEO metadata fields                                                                                                |

### Phase 3 — Storefront

| #    | Task                                                        | Status | Notes                                                                                                                                                                                                  |
| ---- | ----------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 3.1  | Homepage — hero, featured products, collections, newsletter | ✅     | Homepage now hydrates featured products + journal cards from repositories with safe empty states                                                                                                       |
| 3.2  | Product listing page (PLP) — grid, filters, sort            | ✅     | PLP now supports repository-backed query/type/price filters, multi-sort controls, and paginated navigation via URL search params                                                                       |
| 3.3  | Product detail page (PDP) — gallery, variants, add-to-cart  | ✅     | PDP now supports repository-backed variants with add-to-cart plus direct buy-now flow into checkout for full purchase-path integration                                                                 |
| 3.4  | Cart — client-side state with persistence                   | ✅     | Cart persistence now includes end-to-end checkout flow continuity with retry/cancel handling and automatic cart clearing after successful order confirmation                                           |
| 3.5  | Customer auth — signup, login, password reset               | ✅     | `/auth/login`, `/auth/signup`, and `/auth/reset-password` now run through server actions with `auth` abstraction, including reset-link + token update flow                                             |
| 3.6  | Customer account — profile, address book, order history     | ✅     | `/account`, `/account/orders`, and `/account/addresses` now render authenticated repository-backed customer/order/address data with sign-out and empty states                                          |
| 3.7  | Search — full-text with Postgres (products + blog)          | ✅     | Added `/search` with combined product + blog full-text results using Drizzle SQL ranking (`websearch_to_tsquery` + `ts_rank_cd`)                                                                       |
| 3.8  | Collection/category pages                                   | ✅     | `/collections/[slug]` now resolves repository-backed collection/category contexts with filterable, sortable, paginated product grids and SEO metadata                                                  |
| 3.9  | Blog listing page — posts grid with pagination              | ✅     | Blog index now supports repository-backed query + category/tag taxonomy filters, result counts, and pagination controls                                                                                |
| 3.10 | Blog post detail page — full article with related posts     | ✅     | Blog detail route now includes repository-backed related articles alongside full article rendering                                                                                                     |
| 3.11 | Contact page — form, map, phone/WhatsApp links              | ✅     | Storefront contact page now includes validated inquiry form, contact details, WhatsApp links, and responsive map embed, all wired to the Drizzle-backed contact flow                                   |
| 3.12 | Newsletter subscription — footer & standalone               | ✅     | Newsletter now has both footer and standalone `/newsletter` subscription surfaces backed by non-enumerating Drizzle persistence                                                                        |
| 3.13 | Multi-currency selector (region-based pricing)              | ✅     | Added cookie + geo-aware currency selector in header/footer with USD-to-local display conversion across homepage/search/PLP/collection/PDP/cart surfaces (checkout settlement remains USD pending 4.8) |
| 3.14 | Static pages rendering (About, Policies, etc.)              | ✅     | `/pages/[slug]` now renders published CMS HTML via `pagesRepository.findBySlug()` with ISR, static params, and dynamic metadata                                                                        |
| 3.15 | WhatsApp floating button integration                        | ✅     | Floating CTA component implemented                                                                                                                                                                     |

### Phase 4 — Checkout & Payments

| #   | Task                                            | Status | Notes                                                                                                                                                                                                                                                                |
| --- | ----------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | Stripe account setup & API keys                 | ⬜     |                                                                                                                                                                                                                                                                      |
| 4.2 | Checkout session creation (server-side)         | ✅     | Checkout API now canonicalizes line items server-side from variant records (including currency conversion), reserves inventory, and creates Embedded Checkout sessions with validated Stripe metadata.                                                               |
| 4.3 | Stripe webhook — payment confirmation           | ✅     | Webhook now verifies signatures, handles async payment success/failure plus completed/expired/refunded/dispute events, and applies idempotent order/payment transitions with inventory reconciliation and timeline events.                                           |
| 4.4 | Order creation on successful payment            | ✅     | Stripe session persistence now supports pending/paid payment states and finalizes paid orders through idempotent session flows (order items, confirmation email, discount usage, and inventory confirmation).                                                        |
| 4.5 | Post-checkout success/failure pages             | ✅     | Success flow now includes automatic session-status polling for delayed webhook settlement, renders confirmed order details as soon as persisted, and keeps retry/cancel routes available for recovery paths.                                                         |
| 4.6 | Tax calculation strategy                        | ✅     | Checkout session creation now enables Stripe automatic tax with required billing address capture, and order totals persist Stripe-calculated tax amounts from webhook-confirmed sessions.                                                                            |
| 4.7 | Shipping rate integration (international focus) | ✅     | Checkout now supports optional carrier-rate API quotes (configurable endpoint + API key) to build Stripe shipping options dynamically by destination context, with robust fallback to built-in international fixed-rate options when carrier quotes are unavailable. |
| 4.8 | Multi-currency checkout via Stripe              | ✅     | Checkout now submits cart currency to Stripe Embedded Checkout and prices line items in that currency, with mixed-currency cart safeguards to prevent invalid multi-currency session creation.                                                                       |

### Phase 5 — Order Management (Admin)

| #   | Task                                                    | Status | Notes                                                                                                                               |
| --- | ------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 5.1 | Order list — filterable, searchable, sortable           | ✅     | Admin orders now include repository-backed search, status/payment filters, and sort controls with KPI summary cards                 |
| 5.2 | Order detail — line items, customer info, timeline      | ✅     | Order detail route now shows customer context, shipping/billing snapshots, line items, and chronological order events               |
| 5.3 | Order status workflow — pending → fulfilled → completed | ✅     | Admin order status + fulfillment status server actions are implemented and append timeline events on every transition               |
| 5.4 | Refund processing via Stripe                            | ✅     | Admin order detail now supports Stripe refund requests (full/partial with reason), with refund events logged to order timeline      |
| 5.5 | Order notes & internal comments                         | ✅     | Admin detail page now supports internal notes persisted on orders with event logging                                                |
| 5.6 | Customer management panel                               | ✅     | Admin customers panel now includes searchable customer list, lifecycle stats, marketing opt-in visibility, and spend/order insights |

### Phase 6 — Marketing & Discounts

| #   | Task                                                      | Status | Notes                                                                                                                                                                                                                               |
| --- | --------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.1 | Discount engine — percentage, fixed amount, free shipping | ✅     | Admin discounts now support code creation, activation toggles, validity windows, usage limits, and all three discount types via repository-backed workflows                                                                         |
| 6.2 | Coupon code validation at checkout                        | ✅     | Checkout now validates discount eligibility server-side, applies Stripe discount coupons for eligible percentage/fixed codes, and tracks usage on successful webhook completion                                                     |
| 6.3 | Automatic discounts — conditions & rules                  | ✅     | Discounts now support explicit apply modes (`code` or `automatic`) with optional priority rules; checkout automatically selects the best eligible automatic rule when no code is provided                                           |
| 6.4 | Transactional emails — order confirmation, shipping       | ✅     | Resend-backed React Email templates now send order confirmations from `checkout.session.completed` and shipping notifications when admins transition orders to `shipped`, with order timeline logs for sent/failed/skipped outcomes |
| 6.5 | Newsletter email campaigns (via Resend)                   | ✅     | Admin subscribers now includes a campaign composer that sends Resend + React Email broadcasts to active subscribers only, with CTA support and delivery summary feedback (attempted/sent/failed/skipped)                            |

### Phase 7 — Analytics & Optimization

| #   | Task                                                      | Status | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | --------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1 | Admin analytics dashboard — revenue, orders, AOV          | ✅     | Admin analytics now provides repository-backed KPI cards (revenue/orders/AOV plus content/audience/stock indicators) with selectable 7/30/90/365-day reporting windows from a single dashboard surface.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 7.2 | Top products & conversion metrics                         | ✅     | Analytics now includes top products by paid revenue/units sold plus conversion KPIs for checkout→paid, paid→fulfilled, paid→delivered, and paid→refunded over the selected window                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 7.3 | Blog analytics — views per post, popular content          | ✅     | Admin analytics now includes total blog views, average views per post, posts published in the selected window, and a popular-posts table ranked by `view_count`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 7.4 | Performance optimization — caching, ISR, image CDN        | ✅     | Storefront performance now includes explicit ISR windows, static param priming for product/blog detail routes, and optimized `next/image` sizing/priority across core commerce surfaces                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 7.5 | SEO — sitemap, structured data, OG tags (products + blog) | ✅     | Added dynamic `app/sitemap.ts`, site-level metadata base defaults, and Product/Article metadata + JSON-LD with canonical OG/Twitter tags on product and blog detail routes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 7.6 | Accessibility audit (WCAG 2.1 AA)                         | 🟨     | Accessibility hardening now also includes mixed-currency checkout disable semantics in cart, improved status/alert live-region behavior (including reliable repeated cart, add-to-cart, and currency-selector update announcements), pagination keyboard-state semantics, unique form/live-region IDs, keyboard focus parity for card interactions, restored focus-visible indicators on storefront form controls and admin rich-text editor surfaces, auth error-message focus targeting, native form-validation semantics, account table semantics, admin shell landmark/heading clarity, broad admin data-table header semantics across list/detail/analytics surfaces, and explicit labels for admin message workflow controls; manual findings/fixes are tracked in `docs/accessibility-audit-checklist.md` with route-by-route verification still in progress. |
| 7.7 | Error monitoring & logging                                | ✅     | Monitoring stack now includes structured server logs, Next instrumentation (`instrumentation.ts` + `onRequestError`), global route error boundaries, browser runtime capture, ingestion endpoint, and checkout/webhook instrumentation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

### Phase 8 — Deployment & Production

| #   | Task                                            | Status | Notes                                                                                                                                                                                                                        |
| --- | ----------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.1 | Vercel project setup & domain                   | ⬜     |                                                                                                                                                                                                                              |
| 8.2 | Environment variables in Vercel                 | ✅     | Added and aligned `.env.example` plus `docs/vercel-environment-variables.md` with required/optional variable matrix (including carrier shipping quote integration) and rollout checklist for development/preview/production. |
| 8.3 | Stripe live mode activation                     | ⬜     |                                                                                                                                                                                                                              |
| 8.4 | Supabase production project (separate from dev) | ⬜     |                                                                                                                                                                                                                              |
| 8.5 | Database migration strategy (Drizzle)           | ✅     | Initial migration generated and committed, with dedicated package scripts (`db:generate`, `db:migrate`, `db:studio`) plus a deployment/rollback runbook in `docs/database-migration-strategy.md` and README references.      |
| 8.6 | Monitoring, alerts & uptime checks              | ✅     | Added hardened `/api/health` checks, scheduled `/api/cron/health-check` uptime probe, optional outbound alert webhook integration, shared cron auth helper, and Vercel cron scheduling for continuous monitoring             |
| 8.7 | Backup strategy                                 | ⬜     |                                                                                                                                                                                                                              |
| 8.8 | Domain migration from Shopify                   | ⬜     |                                                                                                                                                                                                                              |

---

## Site Reference — thankatreasure.com Analysis

The current Shopify site has the following structure and features that must be replicated and improved:

**Navigation:** Home · All Products · Blogs · Contact

**Homepage sections:**

- Top announcement bar ("Welcome to Tibetan Thanka treasure")
- Hero banner with full-width Thangka artwork image
- "Browse our products" CTA linking to All Products
- "Highlights of Our Collection" — featured product grid (6 products, 2 images per product with hover swap)
- Newsletter signup section ("To receive regular updates, please provide your email address.")
- Footer with country/region selector, payment method icons, privacy policy, contact info

**Product pages:** Display product images (2+ per product with hover swap on cards), title, price in USD, product description, add-to-cart functionality. Products include free brocade and free shipping as value propositions.

**Blog:** Simple blog at `/blogs/news` with article cards showing featured image, title, date, and excerpt. Currently has content about Thangka art history and the shop's legacy.

**Contact page:** Physical address (Paryatan Marg, Thamel, Kathmandu), shop phone, two WhatsApp numbers, two email addresses, and a contact form (name, email, phone, comment).

**Multi-currency:** Supports 30+ countries with localized currency display (USD, EUR, GBP, AUD, JPY, etc.)

**Payment methods:** Accepts Visa, Mastercard, Amex, Apple Pay, Google Pay, PayPal, Shop Pay, Venmo, Discover, Diners Club, Bancontact, iDEAL.

---

## Design System — Maroon & White Theme

### 1.10 Design Tokens & Color Palette

The storefront uses a maroon and white color scheme designed to evoke peace, spirituality, and gallery-like sophistication — appropriate for sacred Thangka art. The admin dashboard uses a separate neutral palette (standard shadcn/ui theme).

**Primary palette:**

| Token                | Hex       | Usage                               |
| -------------------- | --------- | ----------------------------------- |
| `--color-maroon-950` | `#1a0505` | Deepest backgrounds, hero overlays  |
| `--color-maroon-900` | `#4a0e0e` | Primary text on light backgrounds   |
| `--color-maroon-800` | `#6b1414` | Headings, navbar, footer background |
| `--color-maroon-700` | `#8b1a1a` | Primary buttons, active states      |
| `--color-maroon-600` | `#a52222` | Button hover, links                 |
| `--color-maroon-500` | `#b83030` | Accent highlights                   |
| `--color-maroon-400` | `#d05050` | Decorative borders                  |
| `--color-maroon-100` | `#f5e6e6` | Light tinted backgrounds, cards     |
| `--color-maroon-50`  | `#faf2f2` | Page background tint                |

**Neutral palette:**

| Token                   | Hex       | Usage                              |
| ----------------------- | --------- | ---------------------------------- |
| `--color-white`         | `#FFFFFF` | Primary background, card surfaces  |
| `--color-cream`         | `#FDF8F4` | Alternate section backgrounds      |
| `--color-warm-gray-100` | `#F5F0EB` | Subtle dividers, input backgrounds |
| `--color-warm-gray-300` | `#D4CBC2` | Borders, disabled states           |
| `--color-warm-gray-500` | `#8C8278` | Secondary text, captions           |
| `--color-warm-gray-700` | `#534B43` | Body text                          |
| `--color-warm-gray-900` | `#2C2520` | Primary text alternative           |

**Semantic tokens, typography, spacing, Tailwind v4 `@theme` config:** unchanged from previous version of this guide. See the Tailwind v4 CSS-first config block below.

```css
/* globals.css */
@import "tailwindcss";

@theme {
  --color-maroon-950: #1a0505;
  --color-maroon-900: #4a0e0e;
  --color-maroon-800: #6b1414;
  --color-maroon-700: #8b1a1a;
  --color-maroon-600: #a52222;
  --color-maroon-500: #b83030;
  --color-maroon-400: #d05050;
  --color-maroon-100: #f5e6e6;
  --color-maroon-50: #faf2f2;
  --color-warm-gray-100: #f5f0eb;
  --color-warm-gray-300: #d4cbc2;
  --color-warm-gray-500: #8c8278;
  --color-warm-gray-700: #534b43;
  --color-warm-gray-900: #2c2520;
}
```

---

## Phase 1 — Foundation & Infrastructure

### 1.1 Project Scaffolding & Folder Structure

Initialize with `create-next-app` using the App Router and TypeScript.

```bash
npx create-next-app@latest thanka-treasure --typescript --tailwind --app --src-dir
```

> **Next.js 16 / 15+ notes:**
>
> - `cookies()`, `headers()`, `params`, and `searchParams` are now **async** — always `await` them.
> - `fetch()` is **no longer cached by default**. Use `{ cache: 'force-cache' }` explicitly where caching is needed, or rely on ISR via `export const revalidate = N`.
> - Turbopack is stable and the default dev server (`next dev --turbo`).
> - React 19 is the default — Server Actions are stable and preferred over dedicated API routes for mutations.

**The folder structure reflects the abstraction boundaries.** Note `src/db/`, `src/lib/auth/`, and `src/lib/storage/` — these are the only places that change when swapping providers.

```
src/
├── app/
│   ├── (shop)/                    # Storefront route group
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Homepage
│   │   ├── products/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── collections/[slug]/page.tsx
│   │   ├── cart/page.tsx
│   │   ├── checkout/
│   │   │   ├── page.tsx
│   │   │   ├── success/page.tsx
│   │   │   └── cancel/page.tsx
│   │   ├── blogs/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── pages/[slug]/page.tsx
│   │   └── account/
│   │       ├── page.tsx
│   │       ├── orders/page.tsx
│   │       └── addresses/page.tsx
│   │
│   ├── (admin)/
│   │   ├── layout.tsx
│   │   └── admin/
│   │       ├── page.tsx
│   │       ├── products/
│   │       ├── orders/
│   │       ├── blog/
│   │       ├── customers/page.tsx
│   │       ├── discounts/
│   │       ├── analytics/page.tsx
│   │       ├── messages/page.tsx
│   │       ├── subscribers/page.tsx
│   │       ├── pages/
│   │       └── settings/page.tsx
│   │
│   ├── api/
│   │   ├── webhooks/stripe/route.ts
│   │   ├── checkout/route.ts
│   │   ├── upload/route.ts
│   │   ├── contact/route.ts
│   │   └── newsletter/route.ts
│   │
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── callback/route.ts
│   │   └── reset-password/page.tsx
│   │
│   ├── layout.tsx
│   └── globals.css
│
├── components/                    # (admin/, shop/, ui/ — unchanged)
│
├── db/                            # 🔒 DRIZZLE LAYER
│   ├── index.ts                   # Drizzle client (postgres.js → Postgres URL)
│   ├── schema/                    # Drizzle table definitions
│   │   ├── index.ts               # Re-exports all tables
│   │   ├── profiles.ts
│   │   ├── products.ts
│   │   ├── orders.ts
│   │   ├── blog.ts
│   │   ├── marketing.ts
│   │   └── relations.ts
│   └── repositories/              # 🔒 ALL queries live here. Authz lives here.
│       ├── product-repository.ts
│       ├── order-repository.ts
│       ├── customer-repository.ts
│       ├── blog-repository.ts
│       ├── inventory-repository.ts
│       ├── discount-repository.ts
│       ├── contact-repository.ts
│       ├── newsletter-repository.ts
│       └── settings-repository.ts
│
├── lib/
│   ├── auth/                      # 🔒 AUTH ABSTRACTION
│   │   ├── index.ts               # Exports configured `auth` instance
│   │   ├── types.ts               # AuthProvider interface + Session/User types
│   │   └── providers/
│   │       └── supabase.ts        # Only file allowed to import @supabase/ssr
│   │
│   ├── storage/                   # 🔒 STORAGE ABSTRACTION
│   │   ├── index.ts               # Exports configured `storage` instance
│   │   ├── types.ts               # StorageProvider interface
│   │   ├── resolve-url.ts         # bucket+path → public URL helper
│   │   ├── buckets.ts             # Logical bucket name constants
│   │   └── providers/
│   │       └── supabase.ts        # Only file allowed to import @supabase/storage-js
│   │
│   ├── stripe/
│   │   ├── client.ts
│   │   └── helpers.ts
│   ├── currency/
│   │   ├── config.ts
│   │   └── convert.ts
│   ├── store/
│   │   └── cart.ts                # Zustand cart store
│   └── utils/
│       ├── formatters.ts
│       └── validators.ts          # Zod schemas
│
├── types/
│   ├── product.ts
│   ├── order.ts
│   ├── blog.ts
│   └── cart.ts
│   # NOTE: Drizzle infers DB types from schema/. No hand-written DB types.
│
├── middleware.ts                   # Uses `auth` from src/lib/auth, never @supabase/* directly
└── drizzle.config.ts               # drizzle-kit config — points at src/db/schema
```

**Dependencies to install (with latest versions as of April 2026):**

```bash
# Core
npm install drizzle-orm@0.44.6 postgres@3.4.7
npm install -D drizzle-kit@0.31.4

# Provider implementations (only imported inside src/lib/{auth,storage}/providers/)
npm install @supabase/supabase-js@2.101.1 @supabase/ssr@0.10.0

# Payments
npm install stripe@22.0.0 @stripe/stripe-js@9.1.0 @stripe/react-stripe-js

# UI — Tailwind v4 (CSS-first)
npm install tailwindcss@4.2.2 @tailwindcss/vite

# Fonts
npm install @fontsource/playfair-display@5.2.8 @fontsource/inter@5.2.8 @fontsource/lora@5.2.8

# State
npm install zustand@5.0.12

# Forms & Validation
npm install react-hook-form@7.72.1 zod@4.3.6 @hookform/resolvers@5.2.2

# Rich text
npm install @tiptap/react@3.22.2 @tiptap/starter-kit@3.22.2 @tiptap/extension-image @tiptap/extension-link @tiptap/extension-youtube @tiptap/extension-character-count

# Utilities
npm install date-fns@4.1.0 slugify@1.6.9

# Email
npm install resend@6.10.0 @react-email/components@1.0.11
```

**ESLint enforcement of Rule #1 — add to `.eslintrc`:**

```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["@supabase/*"],
            "message": "Import from src/lib/auth or src/lib/storage instead. Direct @supabase/* imports are only allowed inside src/lib/auth/providers/ and src/lib/storage/providers/."
          }
        ]
      }
    ]
  },
  "overrides": [
    {
      "files": ["src/lib/auth/providers/**", "src/lib/storage/providers/**"],
      "rules": { "no-restricted-imports": "off" }
    }
  ]
}
```

---

### 1.2 Supabase Project Creation & Configuration

Create two Supabase projects: one for development and one for production. Never share a Supabase project between environments.

**What Supabase provides today:**

- Hosted Postgres (consumed via Drizzle through the pooler URL — _not_ via the Supabase JS client)
- Auth (consumed via the `AuthProvider` interface)
- Storage (consumed via the `StorageProvider` interface)

**Configuration checklist:**

- Enable email/password auth (disable email confirmations in dev)
- Configure auth redirect URLs for dev and production
- Note both connection strings: **pooler** (port 6543, transaction mode — for app runtime) and **direct** (port 5432 — for `drizzle-kit` migrations only)

**Implementation status update:**

- Foundation Supabase bootstrap migration is committed at `supabase/migrations/20260407100000_foundation_schema.sql`.
- Run `pnpm ops:verify:supabase` to validate required Supabase env vars and probe both `DATABASE_URL` (pooler) + `DIRECT_DATABASE_URL` (direct).
- Use `pnpm ops:verify:supabase -- --skip-db` when validating env wiring without running live DB connectivity checks.

---

### 1.3 Drizzle Setup + Database Schema (Core Tables)

**Drizzle is the source of truth for schema.** Tables are defined in `src/db/schema/*.ts` as TypeScript. Migrations are generated by `drizzle-kit generate` and applied by `drizzle-kit migrate`. Supabase's own migrations folder is not used.

**`src/db/index.ts` — the Drizzle client:**

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!; // Supabase pooler URL today
const client = postgres(connectionString, { prepare: false }); // prepare:false for pgbouncer transaction mode
export const db = drizzle(client, { schema });
```

The `DATABASE_URL` is the only Supabase-specific thing here. Point it at any Postgres tomorrow and the app keeps working.

**`drizzle.config.ts`:**

```ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DIRECT_DATABASE_URL! }, // direct connection for DDL
});
```

**Table design principles (unchanged):**

- Every table gets `id` (UUID), `created_at`, `updated_at`
- Drizzle `$onUpdate` handles auto-timestamps in app code; a Postgres trigger backs it up at the DB level
- Soft deletes (`deleted_at`) for products, customers, orders
- All monetary values stored as integers in cents — never floating point
- Foreign keys have explicit `onDelete` behavior in Drizzle relations

**Core tables** (defined as Drizzle schema, fields identical to previous SQL spec):

- **`profiles`** — `id` (UUID, mirrors auth provider's user ID — see Rule #6), `role` (`customer` | `admin`), `full_name`, `avatar_url`, `phone`. Created by repository function on signup, **not** by a Supabase trigger (triggers are Supabase-flavored and don't travel).
- **`products`** — `title`, `description` (HTML), `slug` (unique), `status`, `product_type`, `vendor`, `tags` (text array).
- **`product_variants`** — `product_id` (FK), `title`, `sku` (unique), `price` (cents), `compare_at_price`, `weight`, `option1`, `option2`, `option3`.
- **`product_images`** — `product_id` (FK), `bucket` (text), `path` (text), `alt_text`, `position`, `variant_id` (nullable FK). **Note:** stores `bucket` + `path`, not a URL — see Rule #5.
- **`categories`** — self-referencing, `name`, `slug`, `parent_id`, `position`, `description`, `image_bucket`, `image_path`.
- **`collections`** — `title`, `slug`, `description`, `image_bucket`, `image_path`, `type`, `conditions` (jsonb).
- **`collection_products`** — join table.
- **`inventory`** — `variant_id` (FK), `quantity`, `reserved_quantity`, `low_stock_threshold`.
- **`customers`** — `profile_id` (nullable FK), `email`, `first_name`, `last_name`, `phone`, `total_orders`, `total_spent`, `notes`, `accepts_marketing`.
- **`addresses`** — `customer_id` (FK), `type`, `is_default`, all address fields, `country_code`.
- **`orders`** — `order_number`, `customer_id`, `email`, `status`, `payment_status`, `fulfillment_status`, `currency`, `subtotal`, `tax_total`, `shipping_total`, `discount_total`, `grand_total` (all cents), `stripe_payment_intent_id`, `stripe_checkout_session_id`, `shipping_address` (jsonb), `billing_address` (jsonb), `notes`.
- **`order_items`** — `order_id`, `variant_id`, snapshotted `product_title`, `variant_title`, `sku`, `quantity`, `unit_price`, `total_price`.
- **`discounts`** — `code` (unique), `type`, `value`, `minimum_order_amount`, `usage_limit`, `usage_count`, `starts_at`, `ends_at`, `is_active`, `applies_to`.
- **`order_events`** — audit log: `order_id`, `event_type`, `description`, `actor`, `metadata` (jsonb).
- **`contact_submissions`** — `name`, `email`, `phone`, `message`, `status`, `admin_notes`, `replied_at`.
- **`newsletter_subscribers`** — `email` (unique), `status`, `source`, `subscribed_at`, `unsubscribed_at`.
- **`static_pages`** — `title`, `slug` (unique), `content` (HTML), `status`, `meta_title`, `meta_description`.
- **`site_settings`** — key-value: `key` (unique), `value` (jsonb).

**Indexes:** GIN indexes on products/blog `tsvector` columns for full-text search. Standard B-tree indexes on FKs, status fields, slugs, dates, and `newsletter_subscribers.email`. All declared in Drizzle schema files.

**Database functions vs repository functions** — what stays in SQL, what moves to TS:

| Logic                                                               | Where it lives                                                  | Why                                                 |
| ------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------- |
| `generate_order_number()`                                           | Drizzle repository (TS)                                         | Portable; just a counter + format                   |
| `reserve_inventory()`, `confirm_inventory()`, `release_inventory()` | Drizzle repository, wrapped in `db.transaction()`               | Transactions are standard Postgres — fully portable |
| `increment_blog_views()`                                            | Drizzle repository — `UPDATE … SET view_count = view_count + 1` | Atomic via SQL increment, no function needed        |
| `handle_new_user()`                                                 | Repository function called from auth signup flow                | Not a DB trigger — triggers are not portable        |
| `update_modified_column()` trigger                                  | Optional Postgres trigger as backup                             | Drizzle `$onUpdate` is the primary mechanism        |

The principle: **anything that can live as a TS function in a repository should**. SQL functions and triggers stay only as defense-in-depth.

---

### 1.4 Drizzle Schema — Blog Tables

- **`blog_posts`** — `title`, `slug` (unique), `content` (HTML from Tiptap), `excerpt` (plain text, max 300 chars), `featured_image_bucket`, `featured_image_path`, `featured_image_alt`, `author_id` (FK to `profiles`), `status` (`draft` | `published` | `scheduled`), `published_at`, `scheduled_at`, `view_count`, `meta_title`, `meta_description`, `og_image_bucket`, `og_image_path`.
- **`blog_categories`** — `name`, `slug` (unique), `description`, `position`.
- **`blog_post_categories`** — join table.
- **`blog_tags`** — `name`, `slug` (unique).
- **`blog_post_tags`** — join table.

**Scheduled publishing without pg_cron** (pg_cron is a Supabase extension and not portable): use a Vercel Cron job hitting `/api/cron/publish-scheduled` every minute, which calls `blogRepository.publishDuePosts()`. The cron config moves with the app, the repository function moves with the codebase. Nothing Supabase-specific.

Other design decisions (`published_at` vs `created_at`, optional `excerpt` auto-generation, separate blog vs product taxonomies) are unchanged.

---

### 1.5 Repository Layer + RLS (Defense-in-Depth)

**Repositories are the contract.** Every read and write goes through a repository function. Authorization is checked inside the repository function using the current session (passed in or read from request context).

**Example repository function:**

```ts
// src/db/repositories/order-repository.ts
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { Session } from "@/lib/auth/types";

export const orderRepository = {
  async findByIdForCustomer(orderId: string, session: Session) {
    if (!session?.user) throw new Error("Unauthorized");
    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(eq(orders.id, orderId), eq(orders.customerId, session.user.id)),
      )
      .limit(1);
    return order ?? null;
  },

  async findByIdForAdmin(orderId: string, session: Session) {
    if (session?.user?.role !== "admin") throw new Error("Forbidden");
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    return order ?? null;
  },
};
```

The authorization check is in the function. If you swap Supabase Auth for Better Auth tomorrow, this code is unchanged — it just receives a different `Session` shape that conforms to the same interface.

**RLS as defense-in-depth (while on Supabase):**

RLS policies are still written and enabled on every table. They duplicate the repository checks. If a bug in repository code lets a query slip through without an authz check, RLS catches it. If you migrate to a non-Supabase Postgres, RLS goes away — the repository checks are now your only line, which is why Rule #4 exists.

**Policy patterns** (unchanged from original spec, abbreviated): public read for active products / published blog posts / categories; owner read for orders / addresses / customers; admin-only for inventory / discounts / settings; public write for contact submissions and newsletter subscribers.

**Admin check:** the `is_admin()` Postgres function still exists for RLS, but the canonical check is `session.user.role === 'admin'` in repositories.

---

### 1.6 Auth Provider Interface + Supabase Implementation

**`src/lib/auth/types.ts` — the interface:**

```ts
export type Session = {
  user: { id: string; email: string; role: "customer" | "admin" } | null;
  expiresAt: Date | null;
};

export interface AuthProvider {
  signUp(
    email: string,
    password: string,
    metadata?: Record<string, unknown>,
  ): Promise<Session>;
  signInWithPassword(email: string, password: string): Promise<Session>;
  signInWithOAuth(
    provider: "google" | "apple",
    redirectTo: string,
  ): Promise<{ url: string }>;
  signOut(): Promise<void>;
  getSession(): Promise<Session>;
  getUser(): Promise<Session["user"]>;
  resetPassword(email: string, redirectTo: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
  verifyOtp(token: string, type: "email" | "recovery"): Promise<Session>;
}
```

**`src/lib/auth/providers/supabase.ts`** — implements `AuthProvider` using `@supabase/ssr`. This is **the only file outside provider folders allowed to import `@supabase/*`**.

**`src/lib/auth/index.ts`:**

```ts
import { SupabaseAuthProvider } from "./providers/supabase";
import type { AuthProvider } from "./types";

export const auth: AuthProvider = new SupabaseAuthProvider();
export type { Session, AuthProvider } from "./types";
```

App code: `import { auth } from '@/lib/auth'`. Future swap is one line in `index.ts`.

**The user-ID mirroring rule (Rule #6):** when Supabase Auth creates a user, the repository signup flow inserts a row into `profiles` with `id` set to the Supabase user UUID. Every FK in the app (`orders.customer_id`, `blog_posts.author_id`, etc.) points at `profiles.id`, **not** at any Supabase-specific identifier. A future migration to Better Auth means: (a) export users from Supabase, (b) import into the new auth provider with the same UUIDs preserved, (c) `profiles` and all FKs are unchanged.

---

### 1.7 Admin Middleware & Route Protection

Root `middleware.ts` calls `auth.getSession()` from `@/lib/auth` — never `createServerClient` from Supabase directly.

**Route rules:**

- `/admin/*` → authenticated + `role === 'admin'` (redirect to login if not)
- `/account/*` → authenticated (redirect to login if not)
- `/auth/*` → redirect to `/` if already authenticated
- Everything else → public

The middleware imports only from `@/lib/auth`. When the auth provider is swapped, middleware code does not change.

---

### 1.8 Environment Variables & Secrets

**Database (Drizzle):**

- `DATABASE_URL` — Supabase pooler URL (port 6543, transaction mode) for app runtime. Generic name on purpose — future swap is just changing this value.
- `DIRECT_DATABASE_URL` — Supabase direct URL (port 5432) for `drizzle-kit` migrations.

**Auth provider (Supabase today):**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (formerly `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY` — used by storage provider for admin operations; never exposed to browser

**Storage provider (Supabase today):** uses the same Supabase URL + service role key as auth.

**Stripe / app:**

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — server only
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`

When swapping providers later, only the auth/storage provider variables change. `DATABASE_URL` and the rest stay generic.

**Implementation status update:**

- `.env.example` now includes all required foundation variables (`CRON_SECRET`, `ALERT_WEBHOOK_URL`, Supabase/Stripe/Resend keys).
- Run `pnpm ops:verify:secrets` to fail fast on missing/malformed production secrets before deployment.
- Deployment env documentation now includes these verification commands in `docs/vercel-environment-variables.md`.

---

### 1.9 Storage Provider Interface + Supabase Implementation

**`src/lib/storage/types.ts`:**

```ts
export type FileRef = { bucket: string; path: string };

export interface StorageProvider {
  upload(
    bucket: string,
    path: string,
    file: File | Blob | Buffer,
    opts?: {
      contentType?: string;
      cacheControl?: string;
      upsert?: boolean;
    },
  ): Promise<FileRef>;
  download(bucket: string, path: string): Promise<Blob>;
  delete(bucket: string, paths: string[]): Promise<void>;
  getPublicUrl(bucket: string, path: string): string;
  createSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number,
  ): Promise<string>;
  list(
    bucket: string,
    prefix?: string,
  ): Promise<{ name: string; path: string }[]>;
  move(bucket: string, fromPath: string, toPath: string): Promise<void>;
  copy(bucket: string, fromPath: string, toPath: string): Promise<void>;
}
```

**`src/lib/storage/buckets.ts` — logical bucket constants:**

```ts
export const BUCKETS = {
  PRODUCT_IMAGES: "product-images",
  BLOG_IMAGES: "blog-images",
  PRIVATE_ASSETS: "private-assets",
} as const;
```

**`src/lib/storage/resolve-url.ts`:**

```ts
import { storage } from "./index";
import type { FileRef } from "./types";

export function resolveUrl(ref: FileRef | null | undefined): string | null {
  if (!ref) return null;
  return storage.getPublicUrl(ref.bucket, ref.path);
}
```

**`src/lib/storage/providers/supabase.ts`** — implements `StorageProvider` using `@supabase/storage-js`. Only file outside `src/lib/storage/providers/` allowed to import Supabase storage SDKs.

**`src/lib/storage/index.ts`:**

```ts
import { SupabaseStorageProvider } from "./providers/supabase";
import type { StorageProvider } from "./types";
export const storage: StorageProvider = new SupabaseStorageProvider();
export { BUCKETS } from "./buckets";
export { resolveUrl } from "./resolve-url";
export type { StorageProvider, FileRef } from "./types";
```

**Supabase buckets to create today:**

1. **`product-images`** — public, 5MB limit, JPEG/PNG/WebP only
2. **`blog-images`** — public, same restrictions
3. **`private-assets`** — private, for invoices/receipts

**File naming convention** (provider-agnostic — any object store handles these paths):

- `products/{product_id}/{timestamp}-{filename}`
- `blog/{post_id}/featured-{timestamp}.{ext}`
- `blog/content/{timestamp}-{filename}`

**Critical: how URLs flow through the system (Rule #5 in practice):**

1. Upload handler returns `{ bucket, path }` — never a URL.
2. Repository writes `bucket` and `path` columns to the database.
3. Read query returns `{ bucket, path }`.
4. View layer calls `resolveUrl({ bucket, path })` to build the public URL just before rendering.
5. `next/image` `remotePatterns` in `next.config.js` includes the Supabase storage domain today; updating it on provider swap is a one-line change.

**Why this matters:** if you ever stored `https://abcxyz.supabase.co/storage/v1/object/public/product-images/...` in a row, migrating to R2/GCS would require a database-wide find-and-replace across every product, blog post, page, and setting. With bucket+path, you re-upload files to the new bucket using the same paths, swap the provider class, and every existing row resolves correctly through the new provider's `getPublicUrl()`.

---

## Phase 2 — Admin Dashboard (Core)

### 2.1 Admin Layout

Shopify-style fixed left sidebar + top bar. Sidebar nav: Home, Orders (badge), Products, **Blog**, Customers, Discounts, Analytics, **Messages** (badge), **Subscribers**, **Pages**, Settings.

Uses shadcn/ui with default neutral theme (NOT the maroon storefront theme). Responsive: sidebar collapses below 1024px.

### 2.2-2.8 Product Management

Product CRUD, variants, image management with hover-swap support, categories/collections, Tiptap rich text editor, inventory tracking with reservation system (via `inventoryRepository`), SEO fields with Google preview.

**All data access through repositories.** Forms call server actions; server actions call `productRepository.create()`, `productRepository.update()`, etc. No direct Drizzle calls in route or component files.

**Image uploads** call the upload route handler, which uses `storage.upload(BUCKETS.PRODUCT_IMAGES, path, file)` and returns `{ bucket, path }`. The form stores both columns. The product card calls `resolveUrl(...)` at render time.

### 2.9 Blog Management — Create, Edit, Publish, Schedule

(Layout, two-column editor, settings panel, Tiptap extensions, publishing workflow, and preview behavior all unchanged from previous version.)

**Scheduled publishing** uses Vercel Cron, not pg_cron — see §1.4. The cron endpoint calls `blogRepository.publishDuePosts()`, which atomically promotes posts whose `scheduled_at <= NOW()` from `scheduled` to `published`.

### 2.10 Blog Categories & Tags

Categories CRUD via `blogRepository.listCategories()` / `createCategory()`. Tags created inline in editor.

### 2.11 Blog Media

**Featured image:** uploaded via `storage.upload(BUCKETS.BLOG_IMAGES, ...)`, stored as `featured_image_bucket` + `featured_image_path` on `blog_posts`. Alt text required.

**Inline images:** Tiptap upload extension hits the same upload route handler. Returned `{ bucket, path }` is converted to a public URL via `resolveUrl()` and inserted into the editor as the `src` of an `<img>` tag. **Note:** the rendered HTML stored in `blog_posts.content` will contain resolved URLs for inline images — this is a deliberate trade-off for editor simplicity. On a future provider migration, a one-time SQL `REPLACE` over the `content` column handles this. Featured images and product images do not have this issue.

### 2.12 Contact Form Submissions

Messages page reads from `contactRepository.list()`. Status workflow, unread badge, admin notes — unchanged.

### 2.13 Newsletter Subscriber Management

`newsletterRepository.list()`, export to CSV, manual add/remove. Stats from repository aggregations.

### 2.14 Static Pages Editor

`pagesRepository` — same Tiptap editor as blog, no categories/tags/featured images.

---

## Phase 3 — Storefront

### 3.1 Homepage

ISR with `revalidate = 3600`. Sections: announcement bar, navigation, hero banner, featured collection, about/story, latest blog posts, newsletter signup, footer. All content sourced via repositories (`settingsRepository.get('hero_image')`, `productRepository.findFeatured()`, `blogRepository.findRecent(3)`, etc.).

### 3.2 Product Listing Page (PLP)

Server component. Filters via async search params (`q`, `type`, `min`, `max`, `sort`, `page`) and calls `productRepository.search(...)`. Supports pagination metadata (`totalPages`, `hasNextPage`, `hasPreviousPage`) for link-based navigation.

### 3.3 Product Detail Page (PDP)

`/products/[slug]`, ISR `revalidate = 1800`. `productRepository.findBySlug(slug)`. JSON-LD `Product` schema. Variant controls now support both add-to-cart and direct buy-now checkout entry.

### 3.4 Cart

Zustand with cookie persistence. Server-side price and stock validation via `productRepository` and `inventoryRepository` before checkout. Cart state now remains available through cancellation/retry and is cleared automatically on successful checkout confirmation.

### 3.5-3.6 Customer Auth & Account

All auth flows now go through `auth` from `@/lib/auth` with server actions for login, signup, and password reset request/token update handling. Account routes are now live and repository-backed via `customerRepository.findByProfileId()`, `orderRepository.listForCustomer()`, and `customerRepository.listAddressesByProfileId()`.

### 3.7 Search

`/search` now performs combined Postgres full-text search across products and blog posts using Drizzle SQL helpers (`websearch_to_tsquery` + `ts_rank_cd`) with ranked results from repository methods.

### 3.8 Collection/Category Pages

`/collections/[slug]`, ISR `revalidate = 1800`. `collectionRepository.findBySlug()` and fallback `collectionRepository.findCategoryBySlug()` resolve page context; product grids are powered by `productRepository.findByCollection()` / `productRepository.findByCategory()` with query, price, sort, and pagination controls.

### 3.9 Blog Listing Page

`/blogs`, ISR `revalidate = 1800`. `blogRepository.listPublishedPage({ query, category, tag, page })` now powers searchable category/tag taxonomy filters, result counts, and pagination controls.

### 3.10 Blog Post Detail Page

`/blogs/[slug]`, ISR `revalidate = 3600`. `blogRepository.findBySlug(slug)` + `blogRepository.findRelated(postId)` now power full article rendering with related content recommendations. View tracking via Server Action calling `blogRepository.incrementViews(id)` (atomic SQL increment, no race conditions). Cookie flag prevents repeat counts within 24h.

### 3.11 Contact Page

Form validated with Zod (client + server). Submission via `contactRepository.create()`. Rate limit: 3 per email per hour, enforced in the route handler.

### 3.12 Newsletter Subscription

`newsletterRepository.subscribe(email, source)` — handles dedupe and returns success either way (prevent enumeration). Subscription surfaces are now implemented in both footer and standalone `/newsletter` page flows.

### 3.13 Multi-Currency Selector

Prices stored in USD cents. Daily exchange rates cached in `site_settings` (or a dedicated `exchange_rates` table). `Intl.NumberFormat` for display. Country detection from `x-vercel-ip-country`.

### 3.14 Static Pages

`/pages/[slug]`, ISR `revalidate = 86400`. `pagesRepository.findBySlug()` now powers CMS HTML rendering, static param generation, and SEO metadata (`meta_title` / `meta_description` fallback handling).

### 3.15 WhatsApp Floating Button

Fixed bottom-right, all storefront pages. Number from `settingsRepository.get('whatsapp_number')`.

---

## Phase 4 — Checkout & Payments

### 4.1 Stripe Setup

Branding: maroon-700 (#8b1a1a). Enable: cards, Apple Pay, Google Pay, PayPal, Bancontact, iDEAL.

> **Stripe v22 notes:** API pinned to `2026-03-25.dahlia`. Recommended UI in 2026 is **Embedded Checkout** (`ui_mode: 'embedded'`) — keeps customer on your domain via iframe. `decimal_string` fields now use `Stripe.Decimal` type.

### 4.2 Checkout Session

Server-side price validation via `productRepository` + `inventoryRepository`. `inventoryRepository.reserve()` (wraps a Drizzle transaction) before session creation.

```ts
const session = await stripe.checkout.sessions.create({
  ui_mode: 'embedded',
  line_items: [...],
  mode: 'payment',
  return_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
  currency: selectedCurrency,
});
return { clientSecret: session.client_secret };
```

### 4.3 Webhooks

Handle: `checkout.session.completed` → `orderRepository.createFromStripeSession()` + `inventoryRepository.confirm()` + send email. `checkout.session.expired` → `inventoryRepository.release()`. `charge.refunded`, `charge.dispute.created`. Idempotency via session ID lookup in `orderRepository`.

### 4.4-4.5 Order Creation & Post-Checkout

Order created in webhook handler only. All product data snapshotted. Success page polls `orderRepository.findByStripeSessionId()` if webhook hasn't processed yet.

### 4.6-4.8

Tax via Stripe Tax. Free international shipping. Multi-currency: convert USD → selected currency at session creation, store `currency` on order.

---

## Phase 5 — Order Management (Admin)

`orderRepository` powers list (filter/search/sort), detail (line items, timeline, financials), status workflow, refunds via `stripe.refunds.create()` + `orderRepository.recordRefund()`. Customer management via `customerRepository`.

**Realtime updates:** for MVP, poll every 30s. When/if real-time is added, define a `RealtimeProvider` interface and add `SupabaseRealtimeProvider` as the first impl.

---

## Phase 6 — Marketing & Discounts

`discountRepository` for CRUD and validation. Transactional emails via Resend v6 + React Email templates. Newsletter campaigns via `newsletterRepository.listActive()` + Resend batch send.

```ts
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({ from, to, subject, react: <OrderConfirmation order={order} /> });
```

---

## Phase 7 — Analytics & Optimization

### 7.1-7.3 Analytics

Revenue, orders, AOV via repository aggregation methods (`analyticsRepository.revenueByDay()`, etc.) — Drizzle's SQL helper for `GROUP BY` queries. Top products. Blog analytics from `view_count` + optional Plausible.

### 7.4 Performance

ISR per page type. `fetch()` not cached by default in Next 15+. React `cache()` for repository calls within a single request. Dynamic imports for Tiptap. `next/image` for all images.

### 7.5 SEO

Sitemap from `productRepository.listSitemap()`, `blogRepository.listSitemap()`, etc. JSON-LD: `Product`, `Article`, `BreadcrumbList`, `Organization`. Shopify URL redirects in `next.config.js`.

### 7.6-7.7

Accessibility: maroon-700 on white passes 4.5:1, existing skip-links/landmarks/focus styles are in place, and a route-by-route WCAG 2.1 AA checklist now lives in `docs/accessibility-audit-checklist.md` to track manual findings and fixes. The first remediation batch closed pagination disabled-state semantics, live-region announcements on checkout/auth flows, repeated component ID collisions, and decorative image alt behavior; the second batch added keyboard-focus parity for product/blog cards, linked blog headings, native validation behavior for contact/newsletter forms, and explicit checkout discount field semantics; the third batch added proper account order-table header/caption semantics plus admin navigation labeling and topbar heading hierarchy cleanup; the fourth batch added caption/scope/row-header semantics to core admin data tables plus explicit labels for admin message workflow controls; the fifth batch extended those table semantics to remaining core admin listings (blog, static pages, and subscribers); the sixth batch finalized scoped table semantics on inventory, order-detail, and analytics ranking tables; the seventh batch aligned customer table semantics with the same caption/scope/row-header pattern; the eighth batch added polite live announcements for cart quantity/remove/clear updates; the ninth batch improved repeated add-to-cart announcement reliability on product detail pages; the tenth batch improved repeated cart status announcement reliability; the eleventh batch added progress/completion status announcements for currency selector updates; the twelfth batch restored focus-visible indicators on storefront form fields where outlines were unintentionally suppressed; the thirteenth batch restored focus-visible indicators on admin rich-text editor surfaces where outlines were suppressed; and the fourteenth batch added focus targeting for auth error messages after server-side form redirects. Monitoring includes structured logging, instrumentation hooks, and alerting for webhook/checkout failures.

---

## Phase 8 — Deployment & Production

### 8.1-8.4

Vercel + GitHub auto-deploy. Separate env vars per environment. Stripe live mode after business verification. Separate Supabase production project.

### 8.5 Database Migration Strategy (Drizzle)

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Review the SQL in drizzle/migrations/
# Apply to dev
npx drizzle-kit migrate

# CI/CD: drizzle-kit migrate runs against production DIRECT_DATABASE_URL on deploy
```

Migrations are committed to git. Never edit applied migrations — always create a new one.

### 8.6-8.8

Health endpoint, PITR backups (Supabase Pro), uptime monitoring. Domain migration from Shopify: build on Vercel preview → 301 redirects → DNS swap → monitor 48h.

---

## Appendix A — Local Development Workflow

> **Prerequisites:** Node.js 20+ (Node 18 reached EOL April 2025).

1. `npm run dev` — Next.js with Turbopack
2. `npx drizzle-kit generate` — generate migration from schema changes
3. `npx drizzle-kit migrate` — apply to local/dev database
4. `npx drizzle-kit studio` — visual DB browser (replaces Supabase Table Editor for query work)
5. `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

**Local Postgres options:**

- **Easiest:** point `DATABASE_URL` at a free Supabase dev project
- **Fully local:** `docker run postgres:16` and point `DATABASE_URL` at it. Auth/Storage still use the dev Supabase project (or stub the providers for tests).

Branching: `main` → production, `develop` → preview, feature branches off `develop`.

---

## Appendix B — Cost Estimate (Monthly)

| Service                 | Free Tier                    | Paid Estimate           |
| ----------------------- | ---------------------------- | ----------------------- |
| Vercel                  | Hobby (free)                 | Pro: $20/mo             |
| Supabase (DB + Auth)    | Free (500MB DB)              | Pro: $25/mo             |
| Cloudflare R2 (storage) | 10 GB storage free, **egress always free** | $0.015/GB stored, $0 egress |
| Stripe                  | No monthly fee               | 2.9% + $0.30/txn        |
| Stripe Tax              | N/A                          | +0.5%/txn               |
| Sentry                  | Free (5K events/mo)          | $0 initially            |
| Resend                  | Free (3K emails/mo)          | $0 initially            |
| Exchange Rate API       | Free (1500 req/mo)           | $0 initially            |
| Domain                  | N/A                          | ~$12/year               |
| **Total (pre-revenue)** |                              | **~$45–50/mo + domain** |

> **Storage choice:** Cloudflare R2 is the planned production storage provider (not Supabase Storage). R2 is S3-compatible, ~30% cheaper per GB stored, and charges **$0 egress** vs. Supabase/S3's $0.09/GB. For an image-heavy Thangka catalog this is the dominant cost line at scale — savings reach hundreds of $/month once egress crosses ~1 TB/mo. Dev environments may continue using `SupabaseStorageProvider`; production swaps to `R2StorageProvider` per Appendix E.3.

---

## Appendix C — Security Checklist

- [ ] ESLint `no-restricted-imports` rule blocks `@supabase/*` outside provider folders
- [ ] All queries go through repository functions
- [ ] Authorization checked in every repository function (not only RLS)
- [ ] RLS enabled on every table as defense-in-depth
- [ ] Service role key never exposed to client
- [ ] File URLs never stored in DB — only `{bucket, path}`
- [ ] Stripe webhook signatures verified
- [ ] Prices validated server-side at checkout
- [ ] HTML sanitized before storage (products AND blog)
- [ ] Admin routes protected by middleware
- [ ] Rate limiting on contact form and newsletter
- [ ] Input validation with Zod on all Server Actions
- [ ] No secrets in `NEXT_PUBLIC_*` variables
- [ ] Content Security Policy headers configured
- [ ] Admin MFA enabled for production
- [ ] Newsletter unsubscribe tokens are signed

---

## Appendix D — Blog Content Strategy

Recommended categories: Thangka Art History, Techniques & Process, Buddhist Traditions, Shop Stories, Collector's Guide.

---

## Appendix E — How to Swap Providers Later

The whole point of the abstraction work. Each migration is scoped to a small number of files.

### E.1 Swap Postgres host (Supabase → Neon / Railway / RDS / self-hosted)

**Files to change:** none in app code. Just env vars.

1. Provision new Postgres on the new host
2. `pg_dump` from Supabase, `pg_restore` into new host (or use Drizzle migrations from scratch + a data export script)
3. Update `DATABASE_URL` and `DIRECT_DATABASE_URL` env vars
4. Redeploy
5. (Optional) Drop RLS policies — they're no longer enforced anyway, and repository checks are now your only authz layer (Rule #4 is why this is safe)

**Estimated effort:** half a day, mostly waiting on `pg_restore`.

### E.2 Swap Auth provider (Supabase Auth → Better Auth / Clerk / Auth.js)

**Files to change:**

1. Create `src/lib/auth/providers/better-auth.ts` implementing `AuthProvider`
2. Change one line in `src/lib/auth/index.ts` to instantiate the new provider
3. Migrate users: export from Supabase Auth, import into new provider **preserving the original user UUIDs** (Rule #6 — `profiles.id` and every FK depends on this)
4. Update auth-related env vars
5. Update auth UI pages if the new provider has different OAuth flows

**Files NOT touched:** every route handler, server action, repository, middleware, and component. They all import `auth` from `@/lib/auth` and don't care which provider is behind it.

**Estimated effort:** 1–2 days including user migration and testing.

### E.3 Swap Storage provider (Supabase Storage → **Cloudflare R2** / S3 / GCS / B2)

**Cloudflare R2 is the planned production target.** R2 exposes the S3 API, so the same provider class works against AWS S3 with only endpoint/credential changes.

**Files to change:**

1. Create `src/lib/storage/providers/r2.ts` (uses `@aws-sdk/client-s3` against R2's S3-compatible endpoint) implementing `StorageProvider`
2. Change one line in `src/lib/storage/index.ts`
3. Migrate files: `rclone` or `aws s3 sync` from Supabase Storage to the new bucket, **preserving paths exactly** (Rule #5 — DB rows reference these paths)
4. Update storage env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` (custom domain or `pub-*.r2.dev`)
5. Update `next.config.js` `remotePatterns` to include the R2 public domain
6. (Inline blog images only) Run a one-time `UPDATE blog_posts SET content = REPLACE(content, 'old-domain', 'new-domain')` for legacy inline image URLs

**Files NOT touched:** every upload handler, every component that displays an image, every repository. They all use `storage` from `@/lib/storage` and `resolveUrl()`.

**Estimated effort:** 1 day plus file sync time (depends on volume).

### E.4 Swap all three at once (full Supabase exit)

Combine E.1 + E.2 + E.3. Estimated effort: 3–5 days end to end including QA.

The reason this is feasible at all is the discipline applied on day one — Rules 1 through 7. Skip any rule and the migration estimate at least doubles.
