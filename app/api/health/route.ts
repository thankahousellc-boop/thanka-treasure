import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/monitoring/cron-auth";
import {
  runHealthChecks,
  stripHealthDetails,
  toHealthSummary,
} from "@/lib/monitoring/health";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const checks = await runHealthChecks();
  const summary = toHealthSummary(checks);
  const includeDetails = isCronAuthorized(request);

  return NextResponse.json(
    {
      ok: summary.ok,
      status: summary.status,
      timestamp: summary.timestamp,
      checks: includeDetails ? checks : stripHealthDetails(checks),
    },
    {
      status: summary.ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
