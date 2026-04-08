import { serverEnv } from "@/lib/env";
import { monitor } from "@/lib/monitoring/logger";

type AlertSeverity = "info" | "warning" | "critical";

type AlertPayload = {
  title: string;
  message: string;
  severity?: AlertSeverity;
  source?: string;
  metadata?: Record<string, unknown>;
};

export async function sendAlert(payload: AlertPayload) {
  const webhook = serverEnv.ALERT_WEBHOOK_URL;

  if (!webhook) {
    monitor.warn("Alert webhook not configured; skipping outbound alert.", {
      source: payload.source,
      title: payload.title,
    });

    return { sent: false as const, reason: "missing_webhook" as const };
  }

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: `[${(payload.severity ?? "warning").toUpperCase()}] ${payload.title}`,
        title: payload.title,
        message: payload.message,
        source: payload.source,
        metadata: payload.metadata,
        timestamp: new Date().toISOString(),
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      monitor.error("Alert webhook returned non-OK status.", undefined, {
        status: response.status,
        statusText: response.statusText,
        source: payload.source,
      });

      return {
        sent: false as const,
        reason: "webhook_non_ok" as const,
        status: response.status,
      };
    }

    return { sent: true as const };
  } catch (error) {
    monitor.error("Alert webhook request failed.", error, {
      source: payload.source,
      title: payload.title,
    });

    return { sent: false as const, reason: "webhook_error" as const };
  }
}
