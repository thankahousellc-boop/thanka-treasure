# Thanka Treasure — Setup Guide

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Drizzle ORM · Supabase · Stripe · Resend

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Step-by-Step Setup](#step-by-step-setup)
  - [1. Clone and Install](#1-clone-and-install)
  - [2. Environment File](#2-environment-file)
  - [3. Supabase](#3-supabase)
  - [4. Database Migrations](#4-database-migrations)
  - [5. Stripe](#5-stripe)
  - [6. Resend (Email)](#6-resend-email)
  - [7. Start the Dev Server](#7-start-the-dev-server)
  - [8. Create Your Admin Account](#8-create-your-admin-account)
  - [9. Verify the Setup](#9-verify-the-setup)
- [Production Deployment (Vercel)](#production-deployment-vercel)
- [Database Management](#database-management)
- [Available Scripts](#available-scripts)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js 20+** — Node 18 reached EOL in April 2025
- **pnpm** — `npm install -g pnpm`
- Accounts on:
  - [Supabase](https://supabase.com) — database, auth, and file storage
  - [Stripe](https://stripe.com) — payments
  - [Resend](https://resend.com) — transactional email
  - [Vercel](https://vercel.com) — production hosting (not needed for local dev)

---

## Quick Start

If you already know what you're doing:

```bash
git clone <repository-url> && cd tibetian-tanka
pnpm install
cp .env.example .env.local   # fill in values — see Step 2
pnpm db:migrate              # apply schema to the database
pnpm ops:verify:supabase     # confirm DB + auth connectivity
pnpm dev                     # http://localhost:3000
```

---

## Step-by-Step Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd tibetian-tanka
pnpm install
```

---

### 2. Environment File

Copy the example and open it in your editor:

```bash
cp .env.example .env.local
```

> **Note:** Next.js reads `.env.local` for local development (takes precedence over `.env`). Never commit `.env.local` — it is already in `.gitignore`.

Fill in each variable as you work through the steps below.

#### Full Variable Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3000` locally, your domain in production |
| `DATABASE_URL` | Yes | Supabase **pooler** URL (port 6543, transaction mode) |
| `DIRECT_DATABASE_URL` | Yes | Supabase **direct** URL (port 5432) — migrations only |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable (anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key — **server only, never expose** |
| `STRIPE_SECRET_KEY` | Yes | `sk_test_...` in dev, `sk_live_...` in production |
| `STRIPE_WEBHOOK_SECRET` | Yes | `whsec_...` from the Stripe CLI (dev) or dashboard (prod) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | `pk_test_...` in dev, `pk_live_...` in production |
| `RESEND_API_KEY` | Yes | Resend API key |
| `RESEND_FROM_EMAIL` | Yes | Verified sender address (e.g. `orders@yourdomain.com`) |
| `CRON_SECRET` | No | Random secret. When set, callers passing `Authorization: Bearer $CRON_SECRET` to `/api/health` receive detailed per-check output |
| `SHIPPING_RATE_API_URL` | No | Carrier rate API endpoint (optional integration) |
| `SHIPPING_RATE_API_KEY` | No | Carrier rate API key |
| `ALERT_WEBHOOK_URL` | No | Slack/webhook URL for outbound alerts (used by `lib/monitoring/alerts.ts`) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | No | WhatsApp contact number (shown on storefront) |

---

### 3. Supabase

#### Create a Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Choose a region close to your primary users.
3. Set a strong database password and save it — you will need it for the connection strings.

> Create **two projects** — one for development, one for production. Never share a database between environments.

#### Get Connection Strings

Go to **Project Settings → Database → Connection string**.

- **`DATABASE_URL`** — copy the **Transaction pooler** URI. Change the port to `6543` if needed. It looks like:
  ```
  postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
  ```
  Append `?pgbouncer=true` at the end if not already present.

- **`DIRECT_DATABASE_URL`** — copy the **Direct connection** URI (port 5432). It looks like:
  ```
  postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres
  ```
  This is only used by `drizzle-kit` for running migrations, never at app runtime.

> **Important:** The application uses `DATABASE_URL` (pooler) for all queries. The `DIRECT_DATABASE_URL` is exclusively for running `pnpm db:migrate`. Using the wrong URL for migrations will cause DDL errors in transaction mode.

#### Get API Keys

Go to **Project Settings → API**:

- **`NEXT_PUBLIC_SUPABASE_URL`** — copy the **Project URL**
- **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** — copy the **anon / public** key
- **`SUPABASE_SERVICE_ROLE_KEY`** — copy the **service_role** key

> The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. It is only used server-side for storage operations. Never include it in `NEXT_PUBLIC_*` variables or expose it to the browser.

#### Configure Authentication

1. Go to **Authentication → Providers**.
2. Email/Password auth is enabled by default — no changes needed for dev.
3. (Optional) Disable email confirmation in development: **Authentication → Email Templates → Confirm signup** → toggle off "Enable email confirmations".
4. Set the **redirect URL** for local dev: **Authentication → URL Configuration** → add `http://localhost:3000/auth/callback` to the allow-list.

#### Create Storage Buckets

Go to **Storage** in the Supabase dashboard and create three buckets:

| Bucket Name | Public | Max Size | Allowed Types |
|---|---|---|---|
| `product-images` | ✅ Yes | 5 MB | `image/jpeg`, `image/png`, `image/webp` |
| `blog-images` | ✅ Yes | 5 MB | `image/jpeg`, `image/png`, `image/webp` |
| `private-assets` | ❌ No | 10 MB | Any |

For the two public buckets, add a storage policy:
- **Name:** `Public read`
- **Operation:** `SELECT`
- **Target roles:** `public` (anon)

For uploads across all buckets, add:
- **Name:** `Authenticated uploads`
- **Operation:** `INSERT`
- **Target roles:** `authenticated`

---

### 4. Database Migrations

With `DIRECT_DATABASE_URL` set, apply the schema:

```bash
pnpm db:migrate
```

This applies all SQL files in `drizzle/migrations/` to your database using the direct connection. Verify the tables were created:

```bash
pnpm ops:verify:supabase
```

You can also browse the data visually:

```bash
pnpm db:studio    # opens at http://localhost:4983
```

---

### 5. Stripe

#### Get API Keys

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com).
2. Stay in **Test mode** (toggle in the top-left).
3. Go to **Developers → API keys**:
   - **`STRIPE_SECRET_KEY`** = the Secret key (`sk_test_...`)
   - **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** = the Publishable key (`pk_test_...`)

#### Set Up Local Webhooks

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Log in
stripe login
```

Start forwarding webhooks to your local server (keep this running in a separate terminal):

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI prints a signing secret:

```
> Ready! Your webhook signing secret is whsec_... (^C to quit)
```

Set that as **`STRIPE_WEBHOOK_SECRET`**. Note: the secret changes each time you restart `stripe listen`.

#### Events the App Handles

| Event | Purpose |
|---|---|
| `checkout.session.completed` | Create order, confirm inventory, send confirmation email |
| `checkout.session.expired` | Release reserved inventory |
| `checkout.session.async_payment_succeeded` | Handle delayed payment success |
| `checkout.session.async_payment_failed` | Handle delayed payment failure |
| `charge.refunded` | Record refund on the order |
| `charge.dispute.created` | Log dispute event to order timeline |

---

### 6. Resend (Email)

1. Go to [resend.com](https://resend.com) → **API Keys** → create a key.
2. Set **`RESEND_API_KEY`** to the generated key.
3. Set **`RESEND_FROM_EMAIL`**:
   - Development: use `onboarding@resend.dev` (Resend sandbox — no domain verification needed)
   - Production: use an address on your verified domain, e.g. `orders@yourdomain.com`

> In production, go to **Resend → Domains** and add your domain. Copy the provided DNS records (TXT/MX/DKIM) to your DNS provider and wait for propagation.

---

### 7. Start the Dev Server

Generate a `CRON_SECRET` — any random 32+ character string:

```bash
openssl rand -hex 32
```

Add it to `.env.local` as `CRON_SECRET`, then start the server:

```bash
pnpm dev
```

The app is available at `http://localhost:3000`.

| Route | What's there |
|---|---|
| `http://localhost:3000` | Storefront homepage |
| `http://localhost:3000/admin` | Admin dashboard (requires admin role) |
| `http://localhost:3000/auth/login` | Customer login |
| `http://localhost:3000/api/health` | Health check endpoint |

---

### 8. Create Your Admin Account

The admin role is determined by `user_metadata.role` or `app_metadata.role` in Supabase Auth. Here is the process:

**Step 1 — Sign up through the app:**

Visit `http://localhost:3000/auth/signup` and create an account with your email and password.

**Step 2 — Promote to admin via Supabase SQL editor:**

Go to your Supabase dashboard → **SQL Editor** and run:

```sql
-- Replace the email with your own
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'your@email.com';
```

Using `app_metadata` (not `user_metadata`) is more secure because users cannot edit it themselves.

**Step 3 — Log out and log back in:**

The role is read from the JWT at session creation time. You must sign out and sign in again for the new role to take effect.

**Step 4 — Verify:**

Visit `http://localhost:3000/admin`. You should see the admin dashboard.

---

### 9. Verify the Setup

```bash
# All secrets valid and correctly formatted
pnpm ops:verify:secrets

# Supabase env wiring + database connectivity
pnpm ops:verify:supabase

# Health endpoint (returns JSON with component status)
curl http://localhost:3000/api/health
```

**End-to-end test checklist:**

- [ ] Storefront loads at `/`
- [ ] Products page loads at `/products`
- [ ] Admin dashboard loads at `/admin` (after promoting your account)
- [ ] Create a product in admin with an image upload
- [ ] Add the product to cart and complete a test checkout using [Stripe test card](https://stripe.com/docs/testing#cards) `4242 4242 4242 4242`
- [ ] Order confirmation email received (if Resend is configured)
- [ ] Order appears in admin at `/admin/orders`

---

## Production Deployment (Vercel)

### 1. Vercel Project Setup

1. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
2. Set the framework to **Next.js** and package manager to **pnpm**.
3. Do not deploy yet — add environment variables first.

### 2. Environment Variables

Go to **Vercel → Project Settings → Environment Variables** and add all variables for each environment:

| Variable | Development | Preview | Production |
|---|---|---|---|
| Stripe keys | `sk_test_...` / `pk_test_...` | `sk_test_...` / `pk_test_...` | `sk_live_...` / `pk_live_...` |
| Supabase project | Dev project credentials | Staging project credentials | Production project credentials |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Auto-assigned by Vercel | `https://yourdomain.com` |

Add every variable from the [Variable Reference](#full-variable-reference) table.

For more detail, see `docs/vercel-environment-variables.md`.

### 3. Production Supabase

1. Create a **separate production Supabase project** — never share dev and prod databases.
2. Enable **Point-in-Time Recovery (PITR)** under **Project Settings → Add-ons** (requires Pro plan). This is your database backup safety net.
3. Create the same three storage buckets (`product-images`, `blog-images`, `private-assets`) with the same policies.
4. Configure auth redirect URLs to `https://yourdomain.com/auth/callback`.
5. If using OAuth (Google/Apple), update the redirect URLs in those provider consoles.

### 4. Production Stripe

1. Switch to **Live mode** in the Stripe dashboard.
2. Copy live API keys (`sk_live_...`, `pk_live_...`).
3. Go to **Developers → Webhooks → Add endpoint**:
   - **URL:** `https://yourdomain.com/api/webhooks/stripe`
   - **Events:** select all six events listed in the [Events table](#events-the-app-handles)
4. Copy the webhook **Signing secret** (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`.

### 5. Run Production Migrations

Before (or immediately after) the first deploy, apply migrations to the production database:

```bash
DIRECT_DATABASE_URL="postgresql://..." pnpm db:migrate
```

Replace the value with your production direct connection string. This runs migrations from `drizzle/migrations/` against production.

> Always ensure PITR is enabled and a backup exists before running production migrations.

### 6. Scheduling & Health Monitoring

No cron jobs are required. Scheduled blog posts become visible automatically on read: a post with `status="scheduled"` and `scheduledAt <= now()` is treated the same as a published post by all public queries (listings, detail pages, sitemap, related, search). Editors can still set the post to `published` manually if they want — both work.

Health checks are exposed at `/api/health` for use by an external uptime monitor (e.g. UptimeRobot, Better Stack). Pass `Authorization: Bearer $CRON_SECRET` to receive detailed per-check output; without it the endpoint returns a public summary. Configure the monitor to alert on non-200 responses.

### 7. Deployment Checklist

- [ ] All environment variables set in Vercel for Production environment
- [ ] Production Supabase project created (separate from dev)
- [ ] Storage buckets created with correct policies on production
- [ ] Database migrations applied to production (`pnpm db:migrate`)
- [ ] PITR enabled on production Supabase project
- [ ] Stripe webhook endpoint registered with production URL
- [ ] Stripe live mode keys set in Vercel Production env
- [ ] Resend domain verified, DNS records propagated
- [ ] `RESEND_FROM_EMAIL` is an address on your verified domain
- [ ] Admin user created with `role: "admin"` in app_metadata
- [ ] `NEXT_PUBLIC_APP_URL` set to `https://yourdomain.com`
- [ ] Health endpoint returns `ok: true`:
  ```bash
  curl https://yourdomain.com/api/health
  ```
- [ ] Complete a test checkout (Stripe test card in preview, real card in production)
- [ ] Confirm order email received
- [ ] Verify cron jobs running in Vercel dashboard → Functions → Cron

---

## Database Management

### Schema Change Workflow

```bash
# 1. Edit schema files in db/schema/
# 2. Generate migration SQL
pnpm db:generate

# 3. Review the generated SQL in drizzle/migrations/ — read it before applying
# 4. Apply to local/dev database
pnpm db:migrate

# 5. Validate schema-to-migration parity (CI uses this)
pnpm db:parity

# 6. Commit both schema files and migration file together
git add db/schema/ drizzle/migrations/
git commit -m "..."
```

### Rules

- **Never edit an applied migration.** Add a new migration instead.
- **Prefer additive changes.** Add columns as nullable, backfill data, then add constraints in a follow-up migration.
- **Migration files are committed to git.** They are the source of truth for schema history.
- **Production migrations run on deploy.** Configure CI/CD to run `pnpm db:migrate` against `DIRECT_DATABASE_URL` as a pre-deploy step.

### Rollback

There is no automated rollback. The strategy for production incidents:

1. Revert the application deployment in Vercel (instant).
2. If a destructive migration ran, restore from PITR backup in Supabase.
3. Write a forward-fix migration for non-destructive issues and re-deploy.

---

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server with Turbopack at `http://localhost:3000` |
| `pnpm build` | Create production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:generate` | Generate Drizzle migration SQL from schema changes |
| `pnpm db:migrate` | Apply pending migrations using `DIRECT_DATABASE_URL` |
| `pnpm db:studio` | Open Drizzle Studio at `http://localhost:4983` |
| `pnpm db:parity` | Validate that schema files match committed migrations |
| `pnpm ops:verify:supabase` | Verify Supabase env wiring and database connectivity |
| `pnpm ops:verify:supabase -- --skip-db` | Validate env only, skip live DB probes |
| `pnpm ops:verify:secrets` | Validate all required secrets are present and correctly formatted |

---

## Troubleshooting

### Migrations fail with "prepared statement" or "connection" errors

- Migrations must use the **direct connection** (`DIRECT_DATABASE_URL`, port 5432), not the pooler.
- The pooler runs in transaction mode and does not support DDL statements.
- Verify `DIRECT_DATABASE_URL` is the direct URL: `db.[project-ref].supabase.co:5432`.

### Stripe webhooks not received locally

- Confirm `stripe listen --forward-to localhost:3000/api/webhooks/stripe` is running in a separate terminal.
- Copy the `whsec_...` from the CLI output each time you restart it — the secret is regenerated.
- The app validates the webhook signature on every event. A mismatched secret causes silent 400 errors.

### Admin dashboard redirects to login

- Ensure your user has `"role": "admin"` in `app_metadata` (see [Step 8](#8-create-your-admin-account)).
- Clear your browser cookies and sign in again — the role is encoded in the JWT at session creation.
- Confirm via Supabase SQL Editor:
  ```sql
  SELECT email, raw_app_meta_data FROM auth.users WHERE email = 'your@email.com';
  ```

### Storage uploads fail (403 or missing bucket error)

- Verify the three buckets exist in Supabase Storage: `product-images`, `blog-images`, `private-assets`.
- Confirm storage policies allow `INSERT` for `authenticated` role.
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set — the upload API route uses the service role client.
- The service role key must never have a `NEXT_PUBLIC_` prefix.

### Emails not sending in development

- Use `RESEND_FROM_EMAIL=onboarding@resend.dev` to skip domain verification in dev.
- In production, verify your domain in Resend and wait for DNS propagation (can take up to 48h).
- Test the API key with `pnpm ops:verify:secrets`.

### `DATABASE_URL is not configured` error at runtime

- Verify `DATABASE_URL` is set in `.env.local` (for local dev) or Vercel environment variables (for deploys).
- Next.js does **not** read plain `.env` in production — use `.env.local` locally and Vercel env vars for deployments.
- Restart the dev server after changing `.env.local`.

### Build fails with type errors

- Run `pnpm build` locally before pushing. TypeScript errors are caught at build time.
- If Stripe types cause issues, check that you are using the Stripe v22 type paths — `Stripe.Checkout.Session.*` (not `SessionCreateParams`) — see `app/api/checkout/route.ts` for examples.
