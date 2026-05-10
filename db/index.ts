import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { serverEnv } from "@/lib/env";

import * as schema from "./schema/index";

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  if (!serverEnv.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const client = postgres(serverEnv.DATABASE_URL, {
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
    max: 10,
  });
  dbInstance = drizzle(client, { schema });

  return dbInstance;
}
