#!/usr/bin/env node

/**
 * Seed (or promote) an admin account.
 *
 * Admin authorization is derived from Supabase Auth metadata
 * (`app_metadata.role === "admin"`), see lib/auth/providers/supabase.ts.
 * This script:
 *   1. Creates the auth user via the service-role admin API (or promotes an
 *      existing user with the same email — idempotent, safe to re-run).
 *   2. Best-effort upserts the matching `profiles` row with role = 'admin'
 *      so the DB RLS layer (`is_admin()`) also recognises the account if the
 *      Supabase foundation migration is ever applied.
 *
 * Usage:
 *   pnpm db:seed:admin                                  # reads ADMIN_* from env
 *   pnpm db:seed:admin --email a@b.com --password 'Pw!' --name 'Root'
 *   pnpm db:seed:admin -p                               # seed the PROD Supabase
 *   pnpm db:seed:admin --prod --yes                     # prod, skip confirm (CI)
 *
 * Env (dev/staging: .env then .env.local; --prod: .env.production then
 * .env.production.local):
 *   NEXT_PUBLIC_SUPABASE_URL      required
 *   SUPABASE_SERVICE_ROLE_KEY     required
 *   DATABASE_URL                  optional (enables profiles upsert)
 *   ADMIN_EMAIL / ADMIN_PASSWORD  defaults for the account
 *   ADMIN_NAME                    optional display name
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { z } from "zod";

import { loadEnvFiles } from "./load-env.mjs";

/** Parse `--flag value` pairs from argv. */
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = "true";
    }
  }
  return out;
}

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a URL"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  DATABASE_URL: z.string().min(1).optional(),
});

const inputSchema = z.object({
  email: z.string().email("admin email must be valid"),
  password: z.string().min(8, "admin password must be at least 8 characters"),
  name: z.string().min(1).optional(),
});

function fail(message, details) {
  console.error(`[db:seed:admin] ${message}`);
  if (details) console.error(details);
  process.exit(1);
}

/** Find an existing auth user by email (paginates listUsers). */
async function findUserByEmail(admin, email) {
  const target = email.toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) return match;
    if (data.users.length < 200) break;
  }
  return null;
}

/** Best-effort: mark the profiles row as admin. No-op if table/connection absent. */
async function upsertAdminProfile(databaseUrl, userId, fullName) {
  if (!databaseUrl) {
    console.warn("[db:seed:admin] DATABASE_URL not set — skipping profiles upsert.");
    return;
  }
  const sql = postgres(databaseUrl, { max: 1, prepare: false, idle_timeout: 5 });
  try {
    await sql`
      insert into public.profiles (id, role, full_name)
      values (${userId}, 'admin', ${fullName ?? null})
      on conflict (id) do update set role = 'admin'
    `;
    console.log("[db:seed:admin] profiles row set to role=admin.");
  } catch (error) {
    console.warn(
      `[db:seed:admin] profiles upsert skipped: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/** Prompt for an explicit "yes" before touching prod (skipped with --yes / CI). */
async function confirmProd(host, skip) {
  console.log(`\n⚠  Seeding admin to PRODUCTION Supabase: ${host}\n`);
  if (skip) return true;
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question('Type "yes" to continue: ');
  rl.close();
  return answer.trim().toLowerCase() === "yes";
}

async function main() {
  const argv = process.argv.slice(2);
  const isProd = argv.includes("-p") || argv.includes("--prod");
  if (isProd) process.env.DB_ENV = "prod";

  loadEnvFiles();

  const envResult = envSchema.safeParse(process.env);
  if (!envResult.success) {
    fail("Invalid environment.", envResult.error.flatten().fieldErrors);
  }
  const env = envResult.data;

  const args = parseArgs(argv);
  const inputResult = inputSchema.safeParse({
    email: args.email ?? process.env.ADMIN_EMAIL,
    password: args.password ?? process.env.ADMIN_PASSWORD,
    name: args.name ?? process.env.ADMIN_NAME,
  });
  if (!inputResult.success) {
    fail(
      "Missing/invalid admin credentials. Set ADMIN_EMAIL + ADMIN_PASSWORD (or pass --email/--password).",
      inputResult.error.flatten().fieldErrors,
    );
  }
  const { email, password, name } = inputResult.data;

  if (isProd) {
    let host = env.NEXT_PUBLIC_SUPABASE_URL;
    try {
      host = new URL(env.NEXT_PUBLIC_SUPABASE_URL).host;
    } catch {
      // leave raw if it doesn't parse
    }
    const skip = argv.includes("--yes") || process.env.CI === "true";
    if (!(await confirmProd(host, skip))) {
      console.log("[db:seed:admin] Aborted.");
      process.exit(1);
    }
  }

  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const adminMeta = { role: "admin" };
  const userMeta = name ? { full_name: name } : {};

  let userId;
  const existing = await findUserByEmail(admin, email);

  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      app_metadata: adminMeta,
      user_metadata: { ...existing.user_metadata, ...userMeta },
    });
    if (error) fail(`Failed to promote existing user: ${error.message}`);
    userId = data.user.id;
    console.log(`[db:seed:admin] Promoted existing user ${email} to admin.`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: adminMeta,
      user_metadata: userMeta,
    });
    if (error) fail(`Failed to create admin user: ${error.message}`);
    userId = data.user.id;
    console.log(`[db:seed:admin] Created admin user ${email}.`);
  }

  await upsertAdminProfile(env.DATABASE_URL, userId, name);

  console.log("[db:seed:admin] Done. Sign in at /admin with the seeded credentials.");
}

main().catch((error) => {
  fail("Unexpected error.", error instanceof Error ? error.stack : String(error));
});
