import { z } from "zod";

function optionalEnv(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().optional(),
});

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().optional(),
  DIRECT_DATABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Enable Stripe automatic tax. Requires a head-office address configured in
  // the Stripe dashboard (Settings > Tax); otherwise session creation fails.
  STRIPE_AUTOMATIC_TAX: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  SHIPPING_RATE_API_URL: z.string().url().optional(),
  SHIPPING_RATE_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  CRON_SECRET: z.string().min(1).optional(),
  ALERT_WEBHOOK_URL: z.string().url().optional(),
  // Upstash Redis for rate limiting. When unset, the limiter no-ops so local
  // dev and CI keep working without a Redis instance.
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_APP_URL: optionalEnv(process.env.NEXT_PUBLIC_APP_URL),
  NEXT_PUBLIC_SUPABASE_URL: optionalEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalEnv(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optionalEnv(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  ),
  NEXT_PUBLIC_WHATSAPP_NUMBER: optionalEnv(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  ),
});

export const serverEnv = serverEnvSchema.parse({
  DATABASE_URL: optionalEnv(process.env.DATABASE_URL),
  DIRECT_DATABASE_URL: optionalEnv(process.env.DIRECT_DATABASE_URL),
  SUPABASE_SERVICE_ROLE_KEY: optionalEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
  STRIPE_SECRET_KEY: optionalEnv(process.env.STRIPE_SECRET_KEY),
  STRIPE_WEBHOOK_SECRET: optionalEnv(process.env.STRIPE_WEBHOOK_SECRET),
  STRIPE_AUTOMATIC_TAX: optionalEnv(process.env.STRIPE_AUTOMATIC_TAX),
  SHIPPING_RATE_API_URL: optionalEnv(process.env.SHIPPING_RATE_API_URL),
  SHIPPING_RATE_API_KEY: optionalEnv(process.env.SHIPPING_RATE_API_KEY),
  RESEND_API_KEY: optionalEnv(process.env.RESEND_API_KEY),
  RESEND_FROM_EMAIL: optionalEnv(process.env.RESEND_FROM_EMAIL),
  CRON_SECRET: optionalEnv(process.env.CRON_SECRET),
  ALERT_WEBHOOK_URL: optionalEnv(process.env.ALERT_WEBHOOK_URL),
  UPSTASH_REDIS_REST_URL: optionalEnv(process.env.UPSTASH_REDIS_REST_URL),
  UPSTASH_REDIS_REST_TOKEN: optionalEnv(process.env.UPSTASH_REDIS_REST_TOKEN),
});
