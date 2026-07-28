#!/usr/bin/env node
// Apply Drizzle migrations to the PRODUCTION Supabase.
//
// Reads DB URLs from `.env.production` (see `.env.production.example`), NOT from
// `.env`/`.env.local`. Sets DB_ENV=prod so drizzle.config.ts loads the prod env
// files, then runs `drizzle-kit migrate`.
//
// Safety: requires `.env.production` to exist, prints the target host, and (unless
// --yes / CI) waits for an explicit "yes" before touching prod.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { resolve } from "node:path";
import { stdin, stdout } from "node:process";

const cwd = process.cwd();
const envFile = resolve(cwd, ".env.production");

if (!existsSync(envFile)) {
  console.error(
    "Missing .env.production — copy .env.production.example and fill in the prod Supabase URLs.",
  );
  process.exit(1);
}

/** Pull DIRECT_DATABASE_URL out of the prod env file just to show the operator the target. */
function readDirectUrl() {
  for (const rawLine of readFileSync(envFile, "utf8").split("\n")) {
    const line = rawLine.replace(/\r$/, "").trim();
    if (!line || line.startsWith("#")) continue;
    const withoutExport = line.startsWith("export ")
      ? line.slice("export ".length).trim()
      : line;
    const eq = withoutExport.indexOf("=");
    if (eq === -1) continue;
    const key = withoutExport.slice(0, eq).trim();
    if (key !== "DIRECT_DATABASE_URL") continue;
    let value = withoutExport.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  return "";
}

const url = readDirectUrl();
if (!url) {
  console.error("DIRECT_DATABASE_URL not set in .env.production.");
  process.exit(1);
}

let host = url;
try {
  host = new URL(url).host;
} catch {
  // leave raw if it doesn't parse
}

console.log(`\n⚠  Applying migrations to PRODUCTION database: ${host}\n`);

const skipPrompt = process.argv.includes("--yes") || process.env.CI === "true";

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

const result = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate"], {
  stdio: "inherit",
  env: { ...process.env, DB_ENV: "prod" },
});

process.exit(result.status ?? 1);
