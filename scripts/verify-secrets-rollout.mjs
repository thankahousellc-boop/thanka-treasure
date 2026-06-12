#!/usr/bin/env node

import { loadEnvFiles } from "./load-env.mjs";

loadEnvFiles();

const REQUIRED_SECRETS = [
  "NEXT_PUBLIC_APP_URL",
  "DATABASE_URL",
  "DIRECT_DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "CRON_SECRET",
];

const RECOMMENDED_SECRETS = [
  "ALERT_WEBHOOK_URL",
  "SHIPPING_RATE_API_URL",
  "SHIPPING_RATE_API_KEY",
  "NEXT_PUBLIC_WHATSAPP_NUMBER",
];

function getEnvValue(name) {
  const value = process.env[name];
  if (!value) {
    return "";
  }

  return value.trim();
}

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function validateFormats() {
  const failures = [];

  const appUrl = getEnvValue("NEXT_PUBLIC_APP_URL");
  if (appUrl && !isValidUrl(appUrl)) {
    failures.push("NEXT_PUBLIC_APP_URL must be a valid URL.");
  }

  const supabaseUrl = getEnvValue("NEXT_PUBLIC_SUPABASE_URL");
  if (supabaseUrl && !isValidUrl(supabaseUrl)) {
    failures.push("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.");
  }

  const stripeSecret = getEnvValue("STRIPE_SECRET_KEY");
  if (stripeSecret && !/^sk_(test|live)_/.test(stripeSecret)) {
    failures.push("STRIPE_SECRET_KEY should start with sk_test_ or sk_live_.");
  }

  const stripePublishable = getEnvValue("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  if (stripePublishable && !/^pk_(test|live)_/.test(stripePublishable)) {
    failures.push(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY should start with pk_test_ or pk_live_.",
    );
  }

  const resendFromEmail = getEnvValue("RESEND_FROM_EMAIL");
  if (resendFromEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resendFromEmail)) {
    failures.push("RESEND_FROM_EMAIL must be a valid email address.");
  }

  const alertWebhookUrl = getEnvValue("ALERT_WEBHOOK_URL");
  if (alertWebhookUrl && !isValidUrl(alertWebhookUrl)) {
    failures.push("ALERT_WEBHOOK_URL must be a valid URL when provided.");
  }

  const shippingRateUrl = getEnvValue("SHIPPING_RATE_API_URL");
  if (shippingRateUrl && !isValidUrl(shippingRateUrl)) {
    failures.push("SHIPPING_RATE_API_URL must be a valid URL when provided.");
  }

  return failures;
}

function main() {
  const missingRequired = REQUIRED_SECRETS.filter((name) => !getEnvValue(name));
  const missingRecommended = RECOMMENDED_SECRETS.filter(
    (name) => !getEnvValue(name),
  );

  const formatFailures = validateFormats();

  if (missingRequired.length > 0 || formatFailures.length > 0) {
    console.error("[verify:secrets] Secret rollout validation failed.");

    if (missingRequired.length > 0) {
      console.error(
        `- Missing required variables: ${missingRequired.join(", ")}`,
      );
    }

    for (const failure of formatFailures) {
      console.error(`- ${failure}`);
    }

    process.exit(1);
  }

  console.log(
    "[verify:secrets] Required production secrets are present and valid.",
  );

  if (missingRecommended.length > 0) {
    console.warn(
      `[verify:secrets] Recommended variables not set: ${missingRecommended.join(", ")}`,
    );
  }
}

main();
