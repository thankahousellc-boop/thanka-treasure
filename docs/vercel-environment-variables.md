# Vercel Environment Variables

This project uses three Vercel environments:

- Development
- Preview
- Production

Configure each variable in Vercel Project Settings -> Environment Variables.

## Required Variables

### App and Database

- `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL`
- `DIRECT_DATABASE_URL`

### Supabase

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Stripe

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Shipping (Optional Carrier Quotes)

- `SHIPPING_RATE_API_URL`
- `SHIPPING_RATE_API_KEY`

### Email

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

### Jobs and Monitoring

- `CRON_SECRET`
- `ALERT_WEBHOOK_URL` (optional but recommended)

### Storefront

- `NEXT_PUBLIC_WHATSAPP_NUMBER`

## Environment Guidance

- Development: use test Stripe keys and development Supabase project.
- Preview: use isolated preview/test keys and non-production DB.
- Production: use live Stripe keys and production Supabase project.
- If carrier quote variables are omitted, checkout falls back to built-in fixed international shipping options.

## Rollout Checklist

1. Add/update variables in Vercel for all target environments.
2. Redeploy after variable changes.
3. Run repository verification commands locally against each target environment config:
   - `pnpm ops:verify:supabase`
   - `pnpm ops:verify:secrets`
4. Verify health endpoint:
   - `GET /api/health` should return `ok: true`.
5. Verify cron authorization:
   - include `Authorization: Bearer <CRON_SECRET>` for cron routes.
6. Verify alerting path:
   - run `POST /api/cron/health-check` with auth in a staging environment.
