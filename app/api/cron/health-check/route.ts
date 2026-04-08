import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/monitoring/cron-auth";
import {
  runHealthChecks,
  stripHealthDetails,
  toHealthSummary,
} from "@/lib/monitoring/health";
import { monitor } from "@/lib/monitoring/logger";
import { sendAlert } from "@/lib/monitoring/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function runHealthCheckJob() {
  const checks = await runHealthChecks();
  const summary = toHealthSummary(checks);

  let alert:
    | Awaited<ReturnType<typeof sendAlert>>
    | { sent: false; reason: "healthy" } = {
    sent: false,
    reason: "healthy",
  };

  if (!summary.ok) {
    alert = await sendAlert({
      title: "Health check degraded",
      message: "One or more production readiness checks failed.",
      severity: "critical",
      source: "cron.health-check",
      metadata: {
        checks,
      },
    });

    monitor.warn("Health check degraded.", {
      source: "cron.health-check",
      checks,
      alert,
    });
  }

  return NextResponse.json(
    {
      ...summary,
      checks: stripHealthDetails(checks),
      alert,
    },
    {
      status: summary.ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    return await runHealthCheckJob();
  } catch (error) {
    monitor.error("Scheduled health check failed.", error, {
      source: "cron.health-check",
    });

    return NextResponse.json(
      { error: "Health check job failed." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
