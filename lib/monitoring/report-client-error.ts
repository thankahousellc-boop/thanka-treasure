export type ClientErrorSource = "error" | "unhandledrejection";

export type ClientErrorPayload = {
  source: ClientErrorSource;
  message: string;
  stack?: string;
  pageUrl?: string;
  userAgent?: string;
  timestamp: string;
};

export function reportClientError(payload: ClientErrorPayload) {
  try {
    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/monitoring/client-errors", blob);
      return;
    }

    void fetch("/api/monitoring/client-errors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      keepalive: true,
    });
  } catch {
    // Never throw from the monitoring layer.
  }
}
