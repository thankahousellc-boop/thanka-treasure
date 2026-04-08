"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/monitoring/report-client-error";

type AppErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function AppError({ error, unstable_retry }: AppErrorProps) {
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
    <section className="container-page py-16 md:py-20">
      <h1 className="font-serif text-3xl text-maroon-900 md:text-4xl">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-warm-gray-700">
        We have logged this issue and are looking into it. Please try loading
        the page again.
      </p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="mt-6 inline-flex h-11 items-center border border-maroon-700 bg-maroon-700 px-6 text-sm font-medium uppercase tracking-[0.08em] text-white hover:bg-maroon-600"
      >
        Try again
      </button>
      {error.digest ? (
        <p className="mt-4 text-xs text-warm-gray-500">
          Error ID: {error.digest}
        </p>
      ) : null}
    </section>
  );
}
