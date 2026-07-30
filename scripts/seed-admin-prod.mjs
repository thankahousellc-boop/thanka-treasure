#!/usr/bin/env node
// Seed (or promote) the admin account on the PRODUCTION Supabase.
//
// Prod counterpart of `pnpm db:seed:admin`, shaped like `scripts/migrate-prod.mjs`:
// reads credentials from `.env.production` / `.env.production.local` (see
// `.env.production.example`), NOT from `.env`/`.env.local`. Sets DB_ENV=prod and
// delegates the actual work to `scripts/seed-admin.mjs`, which is idempotent —
// it creates the auth user or promotes the existing one with the same email.
//
// Safety: requires `.env.production` to exist, prints the target Supabase host,
// and (unless --yes / CI) waits for an explicit "yes" before touching prod.
//
// Usage:
//   pnpm db:seed:admin-prod                                   # ADMIN_* from .env.production
//   pnpm db:seed:admin-prod --email a@b.com --password 'Pw!'  # explicit credentials
//   pnpm db:seed:admin-prod --yes                             # skip confirm (CI)

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
const hasFlag = (name) => argv.some((arg) => arg === `--${name}`);

// Credentials come from flags or ADMIN_* in the prod env file — fail before the
// confirm prompt rather than after, so the operator isn't asked for nothing.
if (!hasFlag("email") && !process.env.ADMIN_EMAIL) {
  console.error("Set ADMIN_EMAIL in .env.production or pass --email.");
  process.exit(1);
}
if (!hasFlag("password") && !process.env.ADMIN_PASSWORD) {
  console.error("Set ADMIN_PASSWORD in .env.production or pass --password.");
  process.exit(1);
}

let host = supabaseUrl;
try {
  host = new URL(supabaseUrl).host;
} catch {
  // leave raw if it doesn't parse
}

console.log(`\n⚠  Seeding admin to PRODUCTION Supabase: ${host}\n`);
console.log(`   Account: ${process.env.ADMIN_EMAIL ?? argv[argv.indexOf("--email") + 1]}\n`);

const skipPrompt = hasFlag("yes") || process.env.CI === "true";

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

// --yes: this script already confirmed; don't prompt twice in the child.
const forwarded = argv.filter((arg) => arg !== "--yes" && arg !== "--prod" && arg !== "-p");
const result = spawnSync(
  process.execPath,
  [resolve(cwd, "scripts/seed-admin.mjs"), "--prod", "--yes", ...forwarded],
  { stdio: "inherit", env: { ...process.env, DB_ENV: "prod" } },
);

process.exit(result.status ?? 1);
