import { sql } from "drizzle-orm";

import { getDb } from "@/db";
import { serverEnv } from "@/lib/env";
import { monitor } from "@/lib/monitoring/logger";

export type HealthCheckResult = {
  ok: boolean;
  details?: string;
};

export type HealthChecks = {
  database: HealthCheckResult;
  stripe: HealthCheckResult;
  resend: HealthCheckResult;
};

async function checkDatabase(): Promise<HealthCheckResult> {
  try {
    const db = getDb();
    await db.execute(sql`select 1`);
    return { ok: true };
  } catch (error) {
    monitor.error("Health check database probe failed.", error, {
      source: "health",
    });

    return { ok: false, details: "Database connection check failed." };
  }
}

export async function runHealthChecks(): Promise<HealthChecks> {
  const database = await checkDatabase();

  return {
    database,
    stripe: {
      ok: Boolean(serverEnv.STRIPE_SECRET_KEY),
      details: serverEnv.STRIPE_SECRET_KEY
        ? undefined
        : "STRIPE_SECRET_KEY is missing.",
    },
    resend: {
      ok: Boolean(serverEnv.RESEND_API_KEY),
      details: serverEnv.RESEND_API_KEY
        ? undefined
        : "RESEND_API_KEY is missing.",
    },
  };
}

export function toHealthSummary(checks: HealthChecks) {
  const ok = Object.values(checks).every((check) => check.ok);

  return {
    ok,
    status: ok ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    checks,
  } as const;
}

export function stripHealthDetails(checks: HealthChecks) {
  return {
    database: { ok: checks.database.ok },
    stripe: { ok: checks.stripe.ok },
    resend: { ok: checks.resend.ok },
  };
}
