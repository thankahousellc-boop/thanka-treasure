import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Load env files into process.env so standalone node scripts (run via
 * `pnpm <script>`) see the same vars as Next.js / drizzle-kit.
 * Existing process.env values win (real env overrides files).
 *
 * Default (staging/dev): `.env` then `.env.local`.
 * When `DB_ENV=prod`: `.env.production` then `.env.production.local` — matches
 * drizzle.config.ts so `--prod` scripts target the prod Supabase instead.
 */
export function loadEnvFiles() {
  const cwd = process.cwd();
  const files =
    process.env.DB_ENV === "prod"
      ? [".env.production", ".env.production.local"]
      : [".env", ".env.local"];
  for (const name of files) {
    const filePath = resolve(cwd, name);
    if (!existsSync(filePath)) continue;
    const text = readFileSync(filePath, "utf8");
    for (const rawLine of text.split("\n")) {
      const line = rawLine.replace(/\r$/, "").trim();
      if (!line || line.startsWith("#")) continue;
      const withoutExport = line.startsWith("export ")
        ? line.slice("export ".length).trim()
        : line;
      const eq = withoutExport.indexOf("=");
      if (eq === -1) continue;
      const key = withoutExport.slice(0, eq).trim();
      let value = withoutExport.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}
