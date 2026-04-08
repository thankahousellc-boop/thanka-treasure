import { NextResponse } from "next/server";
import { z } from "zod";

import { monitor } from "@/lib/monitoring/logger";

const payloadSchema = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(12000).optional(),
  source: z.enum(["error", "unhandledrejection"]),
  pageUrl: z.string().url().optional(),
  userAgent: z.string().max(1000).optional(),
  timestamp: z.string().optional(),
});

export async function POST(request: Request) {
  let json: unknown;

  try {
    json = await request.json();
  } catch (error) {
    monitor.warn("Client error log rejected: invalid JSON payload.", {
      route: "/api/monitoring/client-errors",
      error,
    });

    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    monitor.warn("Client error log rejected: schema validation failed.", {
      route: "/api/monitoring/client-errors",
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        code: issue.code,
      })),
    });

    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  monitor.error("Client runtime error captured.", undefined, {
    route: "/api/monitoring/client-errors",
    source: parsed.data.source,
    pageUrl: parsed.data.pageUrl,
    userAgent: parsed.data.userAgent,
    timestamp: parsed.data.timestamp,
    message: parsed.data.message,
    stack: parsed.data.stack,
  });

  return NextResponse.json({ ok: true });
}
