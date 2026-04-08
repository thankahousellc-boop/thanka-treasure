import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL ?? "",
  },
});
