#!/usr/bin/env node
// Create (and reconcile) the Supabase storage buckets the app uploads into.
//
// Idempotent: missing buckets are created, existing buckets are updated in
// place when their public flag / size limit / allowed MIME types have drifted
// from the spec below. Nothing is ever deleted.
//
// The spec must stay in sync with:
//   lib/storage/buckets.ts                          (bucket ids)
//   app/api/upload/route.ts                         (product/blog/private limits)
//   app/(admin)/admin/settings/branding/actions.ts  (site-asset logo + favicon)
//
// Usage:
//   pnpm db:seed:storage               # staging/dev (.env, .env.local)
//   pnpm db:seed:storage --check       # report drift, change nothing
//   pnpm db:seed:storage:prod          # production (.env.production*), guarded

import { loadEnvFiles } from "./load-env.mjs";

const argv = process.argv.slice(2);
const hasFlag = (name) => argv.includes(`--${name}`);
const isProd = hasFlag("prod") || process.env.DB_ENV === "prod";
const checkOnly = hasFlag("check");

// Must be set before loadEnvFiles() so it reads .env.production* instead of .env*.
if (isProd) process.env.DB_ENV = "prod";
loadEnvFiles();

const MB = 1024 * 1024;

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// site-assets also holds the SVG logo and the .ico favicon.
const SITE_ASSET_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

// private-assets accepts PDFs (certificates/invoices) up to 10MB.
const PRIVATE_ASSET_MIME_TYPES = ["application/pdf", ...IMAGE_MIME_TYPES];

const BUCKETS = [
  {
    id: "product-images",
    public: true,
    fileSizeLimit: 5 * MB,
    allowedMimeTypes: IMAGE_MIME_TYPES,
  },
  {
    id: "blog-images",
    public: true,
    fileSizeLimit: 5 * MB,
    allowedMimeTypes: IMAGE_MIME_TYPES,
  },
  {
    id: "site-assets",
    public: true,
    fileSizeLimit: 5 * MB,
    allowedMimeTypes: SITE_ASSET_MIME_TYPES,
  },
  {
    id: "private-assets",
    public: false,
    fileSizeLimit: 10 * MB,
    allowedMimeTypes: PRIVATE_ASSET_MIME_TYPES,
  },
];

const log = (message) => console.log(`[seed:storage] ${message}`);
const fail = (message) => {
  console.error(`[seed:storage] ${message}`);
  process.exit(1);
};

function requireEnv(name) {
  const value = (process.env[name] ?? "").trim();
  if (!value) {
    fail(
      `Missing required environment variable: ${name}` +
        (isProd ? " (expected in .env.production / .env.production.local)" : ""),
    );
  }
  return value;
}

function sameMimeTypes(actual, expected) {
  const current = [...(actual ?? [])].sort();
  const wanted = [...expected].sort();
  return (
    current.length === wanted.length &&
    current.every((value, index) => value === wanted[index])
  );
}

// Returns the fields that drifted, so --check can explain itself and the
// update call only runs when something actually changed.
function diffBucket(existing, spec) {
  const drift = [];
  if (Boolean(existing.public) !== spec.public) {
    drift.push(
      `public: ${Boolean(existing.public)} → ${spec.public}`,
    );
  }
  // Supabase returns file_size_limit as a string on some API versions.
  const currentLimit =
    existing.file_size_limit == null ? null : Number(existing.file_size_limit);
  if (currentLimit !== spec.fileSizeLimit) {
    const from = currentLimit ? `${Math.round(currentLimit / MB)}MB` : "unlimited";
    drift.push(`size limit: ${from} → ${spec.fileSizeLimit / MB}MB`);
  }
  if (!sameMimeTypes(existing.allowed_mime_types, spec.allowedMimeTypes)) {
    const from = existing.allowed_mime_types?.join(", ") ?? "any";
    drift.push(`mime types: [${from}] → [${spec.allowedMimeTypes.join(", ")}]`);
  }
  return drift;
}

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  let host = supabaseUrl;
  try {
    host = new URL(supabaseUrl).host;
  } catch {
    // leave raw if it doesn't parse
  }
  log(`target: ${host}${isProd ? " (PRODUCTION)" : ""}${checkOnly ? " [check only]" : ""}`);

  // Imported lazily so a missing env var fails before the SDK is loaded.
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: existing, error: listError } =
    await supabase.storage.listBuckets();
  if (listError) {
    fail(
      `Failed to list buckets: ${listError.message} — check that ` +
        `SUPABASE_SERVICE_ROLE_KEY belongs to ${host}.`,
    );
  }

  const byId = new Map((existing ?? []).map((bucket) => [bucket.name, bucket]));
  let failures = 0;
  let drifted = 0;

  for (const spec of BUCKETS) {
    const current = byId.get(spec.id);

    if (!current) {
      if (checkOnly) {
        log(`${spec.id} MISSING — would create`);
        drifted += 1;
        continue;
      }

      const { error } = await supabase.storage.createBucket(spec.id, {
        public: spec.public,
        fileSizeLimit: spec.fileSizeLimit,
        allowedMimeTypes: spec.allowedMimeTypes,
      });

      if (error) {
        console.error(`[seed:storage] Failed to create ${spec.id}: ${error.message}`);
        failures += 1;
        continue;
      }

      log(`created ${spec.id} (${spec.public ? "public" : "private"})`);
      continue;
    }

    const drift = diffBucket(current, spec);
    if (drift.length === 0) {
      log(`${spec.id} ok`);
      continue;
    }

    drifted += 1;
    if (checkOnly) {
      log(`${spec.id} DRIFT — ${drift.join("; ")}`);
      continue;
    }

    const { error } = await supabase.storage.updateBucket(spec.id, {
      public: spec.public,
      fileSizeLimit: spec.fileSizeLimit,
      allowedMimeTypes: spec.allowedMimeTypes,
    });

    if (error) {
      console.error(`[seed:storage] Failed to update ${spec.id}: ${error.message}`);
      failures += 1;
      continue;
    }

    log(`updated ${spec.id} — ${drift.join("; ")}`);
  }

  if (failures > 0) process.exit(1);

  if (checkOnly) {
    if (drifted > 0) {
      log(`${drifted} bucket(s) need changes — rerun without --check to apply.`);
      process.exit(1);
    }
    log("Storage buckets match the spec.");
    return;
  }

  log("Storage buckets are ready.");
}

await main();
