# Thanka Treasure - Setup Guide

Complete setup instructions for local development and production deployment.

**Tech Stack:** Next.js 16 | React 19 | TypeScript | Tailwind CSS v4 | Drizzle ORM | PostgreSQL | Supabase | Stripe | Resend

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
  - [1. Clone and Install](#1-clone-and-install)
  - [2. Environment Variables](#2-environment-variables)
  - [3. Supabase Setup](#3-supabase-setup)
  - [4. Database Setup](#4-database-setup)
  - [5. Stripe Setup](#5-stripe-setup)
  - [6. Resend (Email) Setup](#6-resend-email-setup)
  - [7. Run the App](#7-run-the-app)
  - [8. Verify Everything Works](#8-verify-everything-works)
- [Production Deployment (Vercel)](#production-deployment-vercel)
  - [1. Vercel Project Setup](#1-vercel-project-setup)
  - [2. Production Environment Variables](#2-production-environment-variables)
  - [3. Production Supabase](#3-production-supabase)
  - [4. Production Stripe](#4-production-stripe)
  - [5. Production Email](#5-production-email)
  - [6. Database Migrations](#6-database-migrations)
  - [7. Cron Jobs](#7-cron-jobs)
  - [8. Post-Deployment Verification](#8-post-deployment-verification)
- [Database Management](#database-management)
- [Available Scripts](#available-scripts)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js** 20+
- **pnpm** (package manager)
- **Git**
- Accounts on:
  - [Supabase](https://supabase.com) (database, auth, storage)
  - [Stripe](https://stripe.com) (payments)
  - [Resend](https://resend.com) (transactional email)
  - [Vercel](https://vercel.com) (deployment - for production)

---

## Local Development Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd tibetian-tanka
pnpm install
```

### 2. Environment Variables

Copy the example env file:

```bash
cp .env.example .env.local
```

You will fill in the values in the steps below. Here is the full list of variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Yes | App URL (`http://localhost:3000` for local) |
| `DATABASE_URL` | Yes | PostgreSQL connection string (pooled) |
| `DIRECT_DATABASE_URL` | Yes | PostgreSQL connection string (direct, for migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (secret) |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret (`whsec_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key (`pk_test_...`) |
| `RESEND_API_KEY` | Yes | Resend API key |
| `RESEND_FROM_EMAIL` | Yes | Sender email address |
| `CRON_SECRET` | Yes | Secret for authenticating cron endpoints |
| `SHIPPING_RATE_API_URL` | No | Carrier rate API endpoint |
| `SHIPPING_RATE_API_KEY` | No | Carrier rate API key |
| `ALERT_WEBHOOK_URL` | No | Webhook URL for health alerts |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | No | WhatsApp contact number |

### 3. Supabase Setup

#### Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Choose a region close to your users and set a strong database password.

#### Get Connection Credentials

Navigate to **Project Settings > Database** in your Supabase dashboard:

- **`DATABASE_URL`** - Copy the **Connection Pooler** URI (Transaction mode). It looks like:
  ```
  postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
  ```

- **`DIRECT_DATABASE_URL`** - Copy the **Direct Connection** URI. It looks like:
  ```
  postgresql://postgres.[project-ref]:[password]@aws-0-[region].supabase.com:5432/postgres
  ```

Navigate to **Project Settings > API**:

- **`NEXT_PUBLIC_SUPABASE_URL`** - Copy the **Project URL**
- **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** - Copy the **anon public** key
- **`SUPABASE_SERVICE_ROLE_KEY`** - Copy the **service_role** key (keep secret!)

#### Configure Authentication

1. Go to **Authentication > Providers** in the Supabase dashboard.
2. Email/Password is enabled by default.
3. (Optional) Enable **Google** and/or **Apple** OAuth providers:
   - Add your OAuth client ID and secret for each provider.
   - Set the redirect URL to `http://localhost:3000/auth/callback` (local) or `https://yourdomain.com/auth/callback` (production).

#### Create Storage Buckets

Go to **Storage** in the Supabase dashboard and create these three buckets:

| Bucket Name | Public |
|-------------|--------|
| `product-images` | Yes |
| `blog-images` | Yes |
| `private-assets` | No |

For the public buckets, add a storage policy allowing public reads:
- Policy name: `Public read access`
- Allowed operation: `SELECT`
- Target roles: `public` (anon)

For uploads (all buckets), add a policy for authenticated users:
- Policy name: `Authenticated uploads`
- Allowed operation: `INSERT`
- Target roles: `authenticated`

#### Create Admin User

1. Sign up through the app at `http://localhost:3000/auth/signup`.
2. In the Supabase dashboard, go to **Authentication > Users**.
3. Find your user and click **Edit User** (or use the SQL editor).
4. Update `user_metadata` or `app_metadata` to include:
   ```json
   { "role": "admin" }
   ```

### 4. Database Setup

With your `DIRECT_DATABASE_URL` configured, apply the migrations:

```bash
# Apply all migrations
pnpm db:migrate

# Verify Supabase connectivity
pnpm ops:verify:supabase

# (Optional) Open Drizzle Studio to browse data
pnpm db:studio
```

### 5. Stripe Setup

#### Create a Stripe Account

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) and create an account.
2. Stay in **Test mode** for development.

#### Get API Keys

Navigate to **Developers > API Keys**:

- **`STRIPE_SECRET_KEY`** - Copy the **Secret key** (`sk_test_...`)
- **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** - Copy the **Publishable key** (`pk_test_...`)

#### Set Up Local Webhooks

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Login to your Stripe account
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI will output a webhook signing secret (`whsec_...`). Set it as:

- **`STRIPE_WEBHOOK_SECRET`** = the `whsec_...` value from the CLI output

Keep the `stripe listen` command running in a separate terminal while developing.

#### Required Webhook Events

The app handles these events (they are automatically forwarded by `stripe listen`):

- `checkout.session.completed`
- `checkout.session.expired`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `charge.refunded`
- `charge.dispute.created`

### 6. Resend (Email) Setup

1. Go to [resend.com](https://resend.com) and create an account.
2. Navigate to **API Keys** and create a new key.
3. Set **`RESEND_API_KEY`** to the generated key.
4. Set **`RESEND_FROM_EMAIL`** to your verified sender address.
   - For testing, you can use `onboarding@resend.dev` (Resend's sandbox sender).
   - For production, verify your own domain in Resend.

### 7. Run the App

Generate a CRON_SECRET (any random string, 32+ characters recommended):

```bash
openssl rand -hex 32
```

Set it as `CRON_SECRET` in `.env.local`, then start the dev server:

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`.

### 8. Verify Everything Works

```bash
# Verify all secrets are valid
pnpm ops:verify:secrets

# Verify Supabase setup
pnpm ops:verify:supabase

# Check health endpoint
curl http://localhost:3000/api/health
```

**Test the key flows:**

1. Visit `http://localhost:3000` - storefront should load
2. Sign up at `/auth/signup` - creates a customer account
3. Promote yourself to admin (see [Create Admin User](#create-admin-user))
4. Visit `/admin` - admin dashboard should load
5. Add a product in admin, then test the checkout flow with [Stripe test cards](https://stripe.com/docs/testing#cards)

---

## Production Deployment (Vercel)

### 1. Vercel Project Setup

1. Import the repository in [Vercel](https://vercel.com/new).
2. Select **Next.js** as the framework preset.
3. Set the package manager to **pnpm**.

### 2. Production Environment Variables

Go to **Vercel Project Settings > Environment Variables** and add all variables for each environment:

| Environment | Stripe Keys | Supabase Project | App URL |
|-------------|-------------|------------------|---------|
| Development | `sk_test_...` / `pk_test_...` | Dev project | `http://localhost:3000` |
| Preview | `sk_test_...` / `pk_test_...` | Staging project | Auto-assigned by Vercel |
| Production | `sk_live_...` / `pk_live_...` | Production project | `https://yourdomain.com` |

Add every variable from the [Environment Variables table](#2-environment-variables) with the appropriate values for each environment.

### 3. Production Supabase

**Recommended:** Use separate Supabase projects for staging and production.

1. Create a production Supabase project.
2. Use the production project's credentials for the Production environment in Vercel.
3. Enable **Point-in-Time Recovery (PITR)** on the production project (paid plan) for database backup safety.
4. Create the same storage buckets as described in [Create Storage Buckets](#create-storage-buckets).
5. Set up the same auth providers with production OAuth credentials.
6. Set the redirect URL to `https://yourdomain.com/auth/callback`.

### 4. Production Stripe

1. Switch to **Live mode** in the Stripe dashboard.
2. Copy the live API keys (`sk_live_...`, `pk_live_...`).
3. Create a **webhook endpoint** in Stripe dashboard:
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `checkout.session.expired`
     - `checkout.session.async_payment_succeeded`
     - `checkout.session.async_payment_failed`
     - `charge.refunded`
     - `charge.dispute.created`
4. Copy the webhook **Signing secret** (`whsec_...`) to `STRIPE_WEBHOOK_SECRET`.

### 5. Production Email

1. In Resend, **verify your production domain** (add DNS records as instructed).
2. Set `RESEND_FROM_EMAIL` to an address on your verified domain (e.g., `orders@yourdomain.com`).
3. Use a production API key.

### 6. Database Migrations

Apply migrations against the production database:

```bash
# Set DIRECT_DATABASE_URL to the production direct connection string
DIRECT_DATABASE_URL="postgresql://..." pnpm db:migrate
```

**Safety rules:**
- Always ensure PITR/backups are enabled before running production migrations.
- Prefer additive migrations (add columns/tables first, remove later).
- Never edit already-applied migration files.
- Test webhook and checkout flows after every order-related migration.

### 7. Cron Jobs

The `vercel.json` file configures two cron jobs that run automatically on Vercel:

| Cron | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/publish-scheduled` | Every minute | Publishes scheduled blog posts |
| `/api/cron/health-check` | Every 5 minutes | Runs health checks, sends alerts |

These require the `CRON_SECRET` environment variable. Vercel automatically sends it as the authorization header.

To receive health alerts, set `ALERT_WEBHOOK_URL` to a Slack webhook URL or similar.

### 8. Post-Deployment Verification

```bash
# Run verification scripts against production env
pnpm ops:verify:supabase
pnpm ops:verify:secrets

# Check health endpoint
curl -H "Authorization: Bearer <CRON_SECRET>" https://yourdomain.com/api/health
```

**Rollout Checklist:**

- [ ] All environment variables set in Vercel for Production
- [ ] Database migrations applied to production
- [ ] Storage buckets created with correct policies
- [ ] Stripe webhook endpoint created and verified
- [ ] Resend domain verified and DNS records propagated
- [ ] OAuth redirect URLs updated to production domain
- [ ] Admin user created with `role: "admin"` in metadata
- [ ] Health endpoint returns `ok: true`
- [ ] Test a complete checkout flow with a real (or test) card
- [ ] Verify order confirmation email is received
- [ ] Verify cron jobs are running (check Vercel logs)

---

## Database Management

### Schema Changes Workflow

```bash
# 1. Edit schema files in db/schema/*
# 2. Generate migration SQL
pnpm db:generate

# 3. Review the generated SQL in drizzle/migrations/
# 4. Apply the migration
pnpm db:migrate

# 5. Validate schema/migration parity
pnpm db:parity
```

### Rollback Strategy

- Prefer **forward-fix** migrations over destructive rollback.
- If immediate rollback is required: revert the app deployment and restore the database from PITR/snapshot.
- Keep migrations additive when possible.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Create production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:generate` | Generate Drizzle migration SQL from schema changes |
| `pnpm db:migrate` | Apply pending database migrations |
| `pnpm db:studio` | Open Drizzle Studio (visual database browser) |
| `pnpm db:parity` | Validate schema matches committed migrations |
| `pnpm ops:verify:supabase` | Verify Supabase connectivity and config |
| `pnpm ops:verify:secrets` | Verify all required secrets are valid |

---

## Troubleshooting

### Database connection fails

- Ensure both `DATABASE_URL` (pooled) and `DIRECT_DATABASE_URL` (direct) are set.
- Migrations only work with the direct connection (`DIRECT_DATABASE_URL`).
- Check that your IP is not blocked by Supabase network restrictions.

### Stripe webhooks not received locally

- Make sure `stripe listen --forward-to localhost:3000/api/webhooks/stripe` is running.
- Copy the latest `whsec_...` from the CLI output to `STRIPE_WEBHOOK_SECRET`.
- The signing secret changes each time you restart `stripe listen`.

### Emails not sending

- In development, use `onboarding@resend.dev` as `RESEND_FROM_EMAIL` if you haven't verified a domain.
- In production, verify your domain in Resend and add the required DNS records.

### Admin dashboard returns 403/redirect

- Ensure your user has `"role": "admin"` in `user_metadata` or `app_metadata` in Supabase.
- Clear browser cookies and log in again after changing the role.

### Storage uploads fail

- Verify the three storage buckets exist in Supabase: `product-images`, `blog-images`, `private-assets`.
- Check that storage policies allow uploads for authenticated users.
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set (the upload API uses the service role).

### Build fails with environment variable errors

- All required variables are validated at build time via Zod schemas in `lib/env.ts`.
- Ensure every required variable is set in your `.env.local` (local) or Vercel environment (deployment).
- Run `pnpm ops:verify:secrets` to check which variables are missing or malformed.
