#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

import { loadEnvFiles } from "./load-env.mjs";

loadEnvFiles();

/**
 * Create the storage buckets the app expects. Idempotent: existing buckets are
 * left untouched. Mirrors lib/storage/buckets.ts — keep the ids in sync.
 *
 * Run: pnpm db:seed:storage
 */

const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];

const BUCKETS = [
  { id: "product-images", public: true, allowedMimeTypes: IMAGE_MIME_TYPES },
  { id: "blog-images", public: true, allowedMimeTypes: IMAGE_MIME_TYPES },
  { id: "site-assets", public: true, allowedMimeTypes: IMAGE_MIME_TYPES },
  { id: "private-assets", public: false },
];

const FILE_SIZE_LIMIT = "5MB";

function getEnvValue(name) {
  return (process.env[name] ?? "").trim();
}

function requireEnv(name) {
  const value = getEnvValue(name);
  if (!value) {
    console.error(`[seed:storage] Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: existing, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error(`[seed:storage] Failed to list buckets: ${listError.message}`);
    process.exit(1);
  }

  const existingIds = new Set((existing ?? []).map((bucket) => bucket.name));
  let failures = 0;

  for (const bucket of BUCKETS) {
    if (existingIds.has(bucket.id)) {
      console.log(`[seed:storage] ${bucket.id} already exists — skipped`);
      continue;
    }

    const { error } = await supabase.storage.createBucket(bucket.id, {
      public: bucket.public,
      fileSizeLimit: FILE_SIZE_LIMIT,
      allowedMimeTypes: bucket.allowedMimeTypes,
    });

    if (error) {
      console.error(`[seed:storage] Failed to create ${bucket.id}: ${error.message}`);
      failures += 1;
      continue;
    }

    console.log(
      `[seed:storage] created ${bucket.id} (${bucket.public ? "public" : "private"})`,
    );
  }

  if (failures > 0) {
    process.exit(1);
  }

  console.log("[seed:storage] Storage buckets are ready.");
}

await main();
