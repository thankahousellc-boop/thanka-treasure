#!/usr/bin/env node

import postgres from "postgres";

import { loadEnvFiles } from "./load-env.mjs";

loadEnvFiles();

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "DIRECT_DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const skipDatabaseProbe = process.argv.includes("--skip-db");

function getEnvValue(name) {
  const value = process.env[name];
  if (!value) {
    return "";
  }

  return value.trim();
}

function validateRequiredEnvironment() {
  const missing = REQUIRED_ENV_VARS.filter((name) => !getEnvValue(name));
  if (missing.length > 0) {
    return {
      ok: false,
      message: `Missing required environment variables: ${missing.join(", ")}`,
    };
  }

  return { ok: true };
}

function validateUrl(name) {
  const value = getEnvValue(name);

  try {
    // Throws on malformed values.
    const parsed = new URL(value);
    return { ok: true, host: parsed.host };
  } catch {
    return { ok: false, message: `${name} must be a valid URL.` };
  }
}

async function probeDatabase(label, connectionString) {
  const client = postgres(connectionString, {
    max: 1,
    prepare: false,
    connect_timeout: 8,
    idle_timeout: 5,
  });

  try {
    const [row] = await client`
      select
        current_database() as database_name,
        current_user as database_user,
        version() as server_version
    `;

    return {
      ok: true,
      message: `${label}: connected to ${row.database_name} as ${row.database_user}`,
    };
  } catch (error) {
    return {
      ok: false,
      message: `${label}: ${error instanceof Error ? error.message : "Unknown connection error"}`,
    };
  } finally {
    await client.end({ timeout: 5 });
  }
}

async function main() {
  const errors = [];

  const envValidation = validateRequiredEnvironment();
  if (!envValidation.ok) {
    errors.push(envValidation.message);
  }

  const supabaseUrlValidation = validateUrl("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseUrlValidation.ok) {
    errors.push(supabaseUrlValidation.message);
  }

  const databaseUrlValidation = validateUrl("DATABASE_URL");
  if (!databaseUrlValidation.ok) {
    errors.push(databaseUrlValidation.message);
  }

  const directDatabaseUrlValidation = validateUrl("DIRECT_DATABASE_URL");
  if (!directDatabaseUrlValidation.ok) {
    errors.push(directDatabaseUrlValidation.message);
  }

  if (errors.length > 0) {
    console.error("[verify:supabase] Validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  if (skipDatabaseProbe) {
    console.log(
      "[verify:supabase] Required environment variables are set and URL formats are valid.",
    );
    console.log("[verify:supabase] Database probes were skipped (--skip-db).");
    return;
  }

  const [poolerProbe, directProbe] = await Promise.all([
    probeDatabase("DATABASE_URL", getEnvValue("DATABASE_URL")),
    probeDatabase("DIRECT_DATABASE_URL", getEnvValue("DIRECT_DATABASE_URL")),
  ]);

  const probeFailures = [poolerProbe, directProbe].filter((probe) => !probe.ok);

  console.log(`[verify:supabase] ${poolerProbe.message}`);
  console.log(`[verify:supabase] ${directProbe.message}`);

  if (probeFailures.length > 0) {
    console.error("[verify:supabase] One or more database probes failed.");
    process.exit(1);
  }

  console.log(
    "[verify:supabase] Supabase environment and connectivity checks passed.",
  );
}

await main();
