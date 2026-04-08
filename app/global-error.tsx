"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/monitoring/report-client-error";

import "./globals.css";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function GlobalError({
  error,
  unstable_retry,
}: GlobalErrorProps) {
  useEffect(() => {
    reportClientError({
      source: "error",
      message: error.message,
      stack: error.stack,
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-bg-primary text-text-primary">
        <main className="container-page py-16 md:py-20">
          <h1 className="font-serif text-3xl text-maroon-900 md:text-4xl">
            Unexpected application error
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-warm-gray-700">
            We have captured this issue for investigation. Please try loading
            the application again.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="mt-6 inline-flex h-11 items-center border border-maroon-700 bg-maroon-700 px-6 text-sm font-medium uppercase tracking-[0.08em] text-white hover:bg-maroon-600"
          >
            Retry
          </button>
          {error.digest ? (
            <p className="mt-4 text-xs text-warm-gray-500">
              Error ID: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
