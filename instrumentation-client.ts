import { reportClientError } from "@/lib/monitoring/report-client-error";

window.addEventListener("error", (event) => {
  const error = event.error;

  reportClientError({
    source: "error",
    message: error instanceof Error ? error.message : event.message,
    stack: error instanceof Error ? error.stack : undefined,
    pageUrl: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;

  let message = "Unhandled promise rejection";
  let stack: string | undefined;

  if (reason instanceof Error) {
    message = reason.message;
    stack = reason.stack;
  } else if (typeof reason === "string") {
    message = reason;
  }

  reportClientError({
    source: "unhandledrejection",
    message,
    stack,
    pageUrl: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  });
});
