"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ClearCartOnSuccess } from "@/components/shop/clear-cart-on-success";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

type CheckoutOrder = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  currency: string;
  grandTotal: number;
  createdAt: string;
};

type CheckoutSuccessStatusProps = {
  sessionId: string;
  initialOrder: CheckoutOrder | null;
};

type SessionStatusResponse = {
  found: boolean;
  order?: CheckoutOrder;
};

const MAX_POLL_ATTEMPTS = 12;

export function CheckoutSuccessStatus({
  sessionId,
  initialOrder,
}: CheckoutSuccessStatusProps) {
  const [order, setOrder] = useState<CheckoutOrder | null>(initialOrder);
  const [attempt, setAttempt] = useState(0);
  const [hasError, setHasError] = useState(false);

  const shouldPoll = useMemo(
    () => !order && attempt < MAX_POLL_ATTEMPTS && !hasError,
    [attempt, hasError, order],
  );

  useEffect(() => {
    if (!shouldPoll) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/checkout/session-status?session_id=${encodeURIComponent(sessionId)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        if (!response.ok) {
          setHasError(true);
          return;
        }

        const payload = (await response.json()) as SessionStatusResponse;

        if (payload.found && payload.order) {
          setOrder(payload.order);
          return;
        }

        setAttempt((current) => current + 1);
      } catch {
        setHasError(true);
      }
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [sessionId, shouldPoll]);

  if (order) {
    return (
      <>
        <ClearCartOnSuccess />

        <h1 className="font-serif text-4xl text-maroon-900 md:text-5xl">
          Order Confirmed
        </h1>
        <p className="mt-4 max-w-2xl text-base text-warm-gray-700">
          Thank you for your purchase. Your order has been recorded.
        </p>

        <div className="mt-8 max-w-xl border border-border-light bg-white p-5">
          <p className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
            Order number
          </p>
          <p className="mt-1 font-serif text-2xl text-maroon-900">
            {order.orderNumber}
          </p>

          <div className="mt-4 space-y-2 text-sm text-warm-gray-700">
            <div className="flex items-center justify-between">
              <span>Status</span>
              <span className="uppercase">{order.status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Payment</span>
              <span className="uppercase">{order.paymentStatus}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Fulfillment</span>
              <span className="uppercase">{order.fulfillmentStatus}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Placed</span>
              <span>{formatDate(order.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total</span>
              <span>{formatCurrency(order.grandTotal, order.currency)}</span>
            </div>
          </div>
        </div>

        <Link
          href="/account/orders"
          className="mt-6 inline-flex text-sm font-medium text-maroon-700 hover:text-maroon-600"
        >
          View order history
        </Link>

        <p className="mt-3 text-xs text-warm-gray-500">
          Your cart has been cleared after payment confirmation.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="font-serif text-4xl text-maroon-900 md:text-5xl">
        Payment Received
      </h1>
      <p className="mt-4 max-w-2xl text-base text-warm-gray-700">
        We are finalizing your order. This page checks for your order
        confirmation automatically.
      </p>

      <div
        role={hasError ? "alert" : "status"}
        aria-live="polite"
        className="mt-6 max-w-xl rounded border border-border-light bg-white p-4 text-sm text-warm-gray-700"
      >
        <p>
          {hasError
            ? "Unable to confirm order status right now."
            : "Waiting for payment confirmation webhook..."}
        </p>
        <p className="mt-2 text-xs text-warm-gray-500">
          Attempt {Math.min(attempt + 1, MAX_POLL_ATTEMPTS)} of{" "}
          {MAX_POLL_ATTEMPTS}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/checkout/success?session_id=${encodeURIComponent(sessionId)}`}
          className="inline-flex h-10 items-center border border-maroon-700 bg-maroon-700 px-4 text-xs font-medium uppercase tracking-[0.06em] text-white hover:bg-maroon-600"
        >
          Refresh status
        </Link>
        <Link
          href="/account/orders"
          className="inline-flex h-10 items-center border border-border-light px-4 text-xs font-medium uppercase tracking-[0.06em] text-warm-gray-700 hover:bg-bg-secondary"
        >
          Open order history
        </Link>
      </div>
    </>
  );
}
