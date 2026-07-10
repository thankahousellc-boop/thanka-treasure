# Thanka Treasure

Modern e-commerce foundation built with Next.js App Router, ready for a storefront and Shopify-grade admin dashboard in one codebase.

## Tech Stack

- Next.js 16.2.2
- React 19
- Tailwind CSS v4 (CSS-first theme)
- Supabase (auth, database, storage)
- Stripe (checkout + webhooks)

## App Architecture

- `app/(shop)` storefront routes
- `app/(admin)` admin dashboard routes
- `app/auth` authentication routes
- `app/api` route handlers
- `components/shop` storefront UI
- `components/admin` admin UI
- `lib` domain clients and utilities
- `types` app-wide TypeScript contracts

## Setup

1. Install dependencies

```bash
pnpm install
```

2. Create environment variables

```bash
cp .env.example .env.local
```

3. Start the app

```bash
pnpm dev
```

## Environment Variables

See `.env.example` for all required values.
For Vercel deployment setup, see `docs/vercel-environment-variables.md`.

### Operations Verification

Validate Supabase env wiring and connectivity:

```bash
pnpm ops:verify:supabase
```

Validate production secret rollout completeness and key formats:

```bash
pnpm ops:verify:secrets
```

Use `pnpm ops:verify:supabase -- --skip-db` if you only want env/URL validation without live DB probes.

### Monitoring and Health

- `CRON_SECRET`: when set, gates detailed per-check output from `/api/health` (callers must pass `Authorization: Bearer $CRON_SECRET`). Point an external uptime monitor at `/api/health` to be alerted on non-200 responses.
- `ALERT_WEBHOOK_URL`: optional outbound webhook for alerts emitted via `lib/monitoring/alerts.ts`.
- `RESEND_FROM_EMAIL`: sender used for transactional and campaign emails.

## Database Workflow (Drizzle)

Generate a migration after schema changes:

```bash
pnpm db:generate
```

Apply pending migrations:

```bash
pnpm db:migrate
```

Open Drizzle Studio:

```bash
pnpm db:studio
```

Validate schema-to-migration parity:

```bash
pnpm db:parity
```

Detailed deployment and rollback guidance is documented in
`docs/database-migration-strategy.md`.

## Notes

- Request APIs like cookies/headers/params are async in Next.js 16.
- Route protection is implemented via `proxy.ts` (the `middleware.ts` convention is deprecated).
- Shopify URL parity redirects are configured in `next.config.ts`.
