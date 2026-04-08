"use client";

import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Link from "next/link";
import { useCallback, useId, useMemo, useState } from "react";

import { useCartStore } from "@/lib/store/cart";
import { formatCurrency } from "@/lib/utils/formatters";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

type CheckoutResponse = {
  clientSecret?: string;
  error?: string;
};

export function CheckoutEmbedded() {
  const items = useCartStore((state) => state.items);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const fieldId = useId();
  const discountInputId = `${fieldId}-discount-code`;
  const discountHelpId = `${fieldId}-discount-help`;

  const cartCurrencies = useMemo(
    () => [...new Set(items.map((item) => item.currency.toUpperCase()))],
    [items],
  );
  const checkoutCurrency = cartCurrencies[0] ?? "USD";
  const hasMixedCurrencies = cartCurrencies.length > 1;

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [items],
  );

  const fetchClientSecret = useCallback(async () => {
    setCheckoutError(null);

    if (hasMixedCurrencies) {
      const message =
        "Your cart contains multiple currencies. Clear your cart and re-add items using a single currency.";
      setCheckoutError(message);
      throw new Error(message);
    }

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currency: checkoutCurrency,
        discountCode:
          discountCode.trim().length > 0 ? discountCode.trim() : undefined,
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          image: item.imageUrl,
        })),
      }),
    });

    const payload = (await response
      .json()
      .catch(() => ({}))) as CheckoutResponse;

    if (!response.ok || !payload.clientSecret) {
      const message = payload.error ?? "Unable to initialize checkout.";
      setCheckoutError(message);
      throw new Error(message);
    }

    return payload.clientSecret;
  }, [checkoutCurrency, discountCode, hasMixedCurrencies, items]);

  const options = useMemo(
    () => ({
      fetchClientSecret,
    }),
    [fetchClientSecret],
  );

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded border border-border-light bg-white p-6 text-sm text-warm-gray-700">
        <p>Your cart is empty, so checkout is not available yet.</p>
        <Link
          href="/products"
          className="mt-3 inline-flex text-sm font-medium text-maroon-700 hover:text-maroon-600"
        >
          Browse products
        </Link>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="mt-8 rounded border border-border-light bg-white p-6 text-sm text-warm-gray-700">
        <p>
          Stripe checkout is not configured. Set
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable payments.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="overflow-hidden border border-border-light bg-white p-4 md:p-6">
        <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>

      <aside className="h-fit border border-border-light bg-white p-5">
        <h2 className="font-serif text-2xl text-maroon-900">Order summary</h2>

        <label htmlFor={discountInputId} className="mt-4 block space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
            Discount code
          </span>
          <input
            id={discountInputId}
            type="text"
            aria-describedby={discountHelpId}
            value={discountCode}
            onChange={(event) =>
              setDiscountCode(event.target.value.toUpperCase())
            }
            placeholder="WELCOME10"
            className="h-10 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900 focus:border-maroon-600"
          />
        </label>
        <p id={discountHelpId} className="mt-1 text-xs text-warm-gray-500">
          Optional. Code validation occurs when checkout is initialized.
        </p>

        <ul className="mt-4 space-y-2 text-sm text-warm-gray-700">
          {items.map((item) => (
            <li
              key={item.variantId}
              className="flex items-start justify-between gap-3"
            >
              <div>
                <p>{item.title}</p>
                {item.variantTitle ? (
                  <p className="text-xs text-warm-gray-500">
                    {item.variantTitle}
                  </p>
                ) : null}
                <p className="text-xs text-warm-gray-500">
                  Qty {item.quantity}
                </p>
              </div>
              <span>
                {formatCurrency(
                  item.unitPrice * item.quantity,
                  item.currency.toUpperCase(),
                )}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-border-light pt-3 text-sm text-warm-gray-700">
          <div className="flex items-center justify-between">
            <span>Total</span>
            <span className="font-medium text-maroon-900">
              {formatCurrency(total, checkoutCurrency)}
            </span>
          </div>
          <p className="mt-2 text-xs text-warm-gray-500">
            Shipping options and taxes are calculated during Stripe checkout
            based on destination details.
          </p>
          {hasMixedCurrencies ? (
            <p className="mt-2 text-xs text-red-700">
              Mixed-currency cart detected. Please clear cart and re-add items
              in one currency before checkout.
            </p>
          ) : null}
        </div>

        {checkoutError ? (
          <p
            role="alert"
            aria-live="assertive"
            className="mt-4 text-sm text-red-700"
          >
            {checkoutError}
          </p>
        ) : null}
      </aside>
    </div>
  );
}
