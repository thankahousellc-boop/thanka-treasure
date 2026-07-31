#!/usr/bin/env node
// Create/reconcile the storage buckets on the PRODUCTION Supabase.
//
// Prod counterpart of `pnpm db:seed:storage`, shaped like
// `scripts/seed-admin-prod.mjs`: reads credentials from `.env.production` /
// `.env.production.local` (see `.env.production.example`), NOT from
// `.env`/`.env.local`. Sets DB_ENV=prod and delegates to
// `scripts/seed-storage-buckets.mjs`, which is idempotent.
//
// Safety: requires `.env.production` to exist, prints the target Supabase host,
// and (unless --yes / CI) waits for an explicit "yes" before touching prod.
//
// Usage:
//   pnpm db:seed:storage:prod           # create/update buckets on prod
//   pnpm db:seed:storage:prod --check   # report drift only, change nothing
//   pnpm db:seed:storage:prod --yes     # skip confirm (CI)

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { resolve } from "node:path";
import { stdin, stdout } from "node:process";

import { loadEnvFiles } from "./load-env.mjs";

const cwd = process.cwd();
const envFile = resolve(cwd, ".env.production");

if (!existsSync(envFile)) {
  console.error(
    "Missing .env.production — copy .env.production.example and fill in the prod Supabase URL + service-role key.",
  );
  process.exit(1);
}

process.env.DB_ENV = "prod";
loadEnvFiles();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  console.error("NEXT_PUBLIC_SUPABASE_URL not set in .env.production.");
  process.exit(1);
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY not set in .env.production.");
  process.exit(1);
}

const argv = process.argv.slice(2);
const hasFlag = (name) => argv.includes(`--${name}`);
const checkOnly = hasFlag("check");

let host = supabaseUrl;
try {
  host = new URL(supabaseUrl).host;
} catch {
  // leave raw if it doesn't parse
}

// --check never writes, so it doesn't need the confirmation gate.
const skipPrompt = checkOnly || hasFlag("yes") || process.env.CI === "true";

console.log(
  checkOnly
    ? `\n   Checking storage buckets on PRODUCTION Supabase: ${host}\n`
    : `\n⚠  Creating/updating storage buckets on PRODUCTION Supabase: ${host}\n`,
);

async function confirm() {
  if (skipPrompt) return true;
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question('Type "yes" to continue: ');
  rl.close();
  return answer.trim().toLowerCase() === "yes";
}

if (!(await confirm())) {
  console.log("Aborted.");
  process.exit(1);
}

const forwarded = argv.filter((arg) => arg !== "--yes" && arg !== "--prod");
const result = spawnSync(
  process.execPath,
  [resolve(cwd, "scripts/seed-storage-buckets.mjs"), "--prod", ...forwarded],
  { stdio: "inherit", env: { ...process.env, DB_ENV: "prod" } },
);

process.exit(result.status ?? 1);
