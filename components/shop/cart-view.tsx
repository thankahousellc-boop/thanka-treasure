"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { BASE_CURRENCY } from "@/lib/currency/config";
import { convertFromUsd, type ExchangeRateMap } from "@/lib/currency/convert";
import { useCartStore } from "@/lib/store/cart";
import { formatCurrency } from "@/lib/utils/formatters";

type CartViewProps = {
  displayCurrency: string;
  exchangeRates: ExchangeRateMap;
};

export function CartView({ displayCurrency, exchangeRates }: CartViewProps) {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clear = useCartStore((state) => state.clear);
  const [cartStatusMessage, setCartStatusMessage] = useState("");

  const announceStatus = (message: string) => {
    setCartStatusMessage("");
    window.setTimeout(() => {
      setCartStatusMessage(message);
    }, 0);
  };

  const convertItemAmount = (amount: number, itemCurrency: string) => {
    if (itemCurrency !== BASE_CURRENCY) {
      return amount;
    }

    return convertFromUsd(amount, displayCurrency, exchangeRates);
  };

  const resolveDisplayCurrency = (itemCurrency: string) =>
    itemCurrency === BASE_CURRENCY ? displayCurrency : itemCurrency;

  const subtotal = items.reduce(
    (sum, item) =>
      sum + convertItemAmount(item.unitPrice, item.currency) * item.quantity,
    0,
  );
  const hasNonBaseItems = items.some((item) => item.currency !== BASE_CURRENCY);
  const hasMixedCurrencies =
    new Set(items.map((item) => item.currency)).size > 1;
  const checkoutCurrency = items[0]?.currency ?? BASE_CURRENCY;
  const mixedCurrencyWarningId = "cart-mixed-currency-warning";

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded border border-border-light bg-white p-6 text-sm text-warm-gray-700">
        <p>Your cart is currently empty.</p>
        <p role="status" aria-live="polite" className="sr-only">
          {cartStatusMessage}
        </p>
        <Link
          href="/products"
          className="mt-3 inline-flex text-sm font-medium text-maroon-700 hover:text-maroon-600"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        {items.map((item) => (
          <article
            key={item.variantId}
            className="grid gap-4 border border-border-light bg-white p-4 sm:grid-cols-[104px_1fr]"
          >
            <div className="relative aspect-square overflow-hidden bg-bg-secondary">
              <Image
                src={item.imageUrl ?? "/next.svg"}
                alt={item.title}
                fill
                sizes="104px"
                className="object-cover"
              />
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="font-serif text-xl text-maroon-900">
                  {item.title}
                </h3>
                <p className="text-sm text-warm-gray-600">/{item.slug}</p>
                {item.variantTitle ? (
                  <p className="text-sm text-warm-gray-600">
                    {item.variantTitle}
                  </p>
                ) : null}
              </div>

              <p className="text-sm text-warm-gray-700">
                {formatCurrency(
                  convertItemAmount(item.unitPrice, item.currency),
                  resolveDisplayCurrency(item.currency),
                )}{" "}
                each
              </p>

              <div className="flex items-center gap-3">
                <label
                  htmlFor={`qty-${item.variantId}`}
                  className="text-xs uppercase tracking-[0.08em] text-warm-gray-500"
                >
                  Qty
                </label>
                <input
                  id={`qty-${item.variantId}`}
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    const normalizedQuantity =
                      Number.isNaN(nextValue) || nextValue < 1 ? 1 : nextValue;

                    updateQuantity(item.variantId, normalizedQuantity);
                    announceStatus(
                      `${item.title} quantity updated to ${normalizedQuantity}.`,
                    );
                  }}
                  className="h-9 w-20 border border-border-light bg-white px-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    removeItem(item.variantId);
                    announceStatus(`${item.title} removed from cart.`);
                  }}
                  aria-label={`Remove ${item.title} from cart`}
                  className="text-sm font-medium text-maroon-700 hover:text-maroon-600"
                >
                  Remove
                </button>
              </div>

              <p className="text-sm font-medium text-maroon-900">
                Line total:{" "}
                {formatCurrency(
                  convertItemAmount(item.unitPrice, item.currency) *
                    item.quantity,
                  resolveDisplayCurrency(item.currency),
                )}
              </p>
            </div>
          </article>
        ))}
      </div>

      <aside className="h-fit border border-border-light bg-white p-5">
        <h2 className="font-serif text-2xl text-maroon-900">Summary</h2>
        <div className="mt-4 space-y-3 text-sm text-warm-gray-700">
          <div className="flex items-center justify-between">
            <span>Items</span>
            <span>
              {items.reduce((count, item) => count + item.quantity, 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal, displayCurrency)}</span>
          </div>
          {hasMixedCurrencies ? (
            <p className="text-xs text-red-700">
              Your cart contains multiple currencies. Clear cart and re-add
              items in a single currency before checkout.
            </p>
          ) : hasNonBaseItems ? (
            <p className="text-xs text-warm-gray-500">
              Checkout is processed in {checkoutCurrency}. Taxes and shipping
              are calculated at checkout.
            </p>
          ) : displayCurrency !== BASE_CURRENCY ? (
            <p className="text-xs text-warm-gray-500">
              Display prices are converted from USD estimates.
            </p>
          ) : (
            <p className="text-xs text-warm-gray-500">
              Taxes and shipping are calculated at checkout.
            </p>
          )}
        </div>

        {hasMixedCurrencies ? (
          <button
            type="button"
            disabled
            aria-describedby={mixedCurrencyWarningId}
            className="mt-5 inline-flex h-11 w-full items-center justify-center border border-maroon-700 bg-maroon-700 px-4 text-sm font-medium uppercase tracking-[0.08em] text-white opacity-60"
          >
            Proceed to checkout
          </button>
        ) : (
          <Link
            href="/checkout"
            className="mt-5 inline-flex h-11 w-full items-center justify-center border border-maroon-700 bg-maroon-700 px-4 text-sm font-medium uppercase tracking-[0.08em] text-white hover:bg-maroon-600"
          >
            Proceed to checkout
          </Link>
        )}

        <button
          type="button"
          onClick={() => {
            clear();
            announceStatus("Cart cleared.");
          }}
          className="mt-3 text-sm font-medium text-maroon-700 hover:text-maroon-600"
        >
          Clear cart
        </button>

        {hasMixedCurrencies ? (
          <p id={mixedCurrencyWarningId} className="mt-2 text-xs text-red-700">
            Checkout is disabled until your cart uses a single currency.
          </p>
        ) : null}

        <p role="status" aria-live="polite" className="sr-only">
          {cartStatusMessage}
        </p>
      </aside>
    </div>
  );
}
