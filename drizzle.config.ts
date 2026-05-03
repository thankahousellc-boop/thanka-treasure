import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { defineConfig } from "drizzle-kit";

/** Load `.env` then `.env.local` so `drizzle-kit migrate` picks up DATABASE_URL overrides (Next.js parity). */
function loadEnvFiles() {
  const cwd = process.cwd();
  for (const name of [".env", ".env.local"] as const) {
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
      process.env[key] = value;
    }
  }
}

loadEnvFiles();

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL ?? "",
  },
});
