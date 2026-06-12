"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BASE_CURRENCY } from "@/lib/currency/config";
import { convertFromUsd, type ExchangeRateMap } from "@/lib/currency/convert";
import { useCartDrawerStore } from "@/lib/store/cart-drawer";
import { getCartLineKey, useCartStore } from "@/lib/store/cart";
import { formatCurrency } from "@/lib/utils/formatters";

type CartDrawerProps = {
  displayCurrency: string;
  exchangeRates: ExchangeRateMap;
};

export function CartDrawer({ displayCurrency, exchangeRates }: CartDrawerProps) {
  const isOpen = useCartDrawerStore((state) => state.isOpen);
  const close = useCartDrawerStore((state) => state.close);

  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clear = useCartStore((state) => state.clear);
  const [statusMessage, setStatusMessage] = useState("");

  const announceStatus = (message: string) => {
    setStatusMessage("");
    window.setTimeout(() => setStatusMessage(message), 0);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, close]);

  const convertItemAmount = (amount: number, itemCurrency: string) =>
    itemCurrency === BASE_CURRENCY
      ? convertFromUsd(amount, displayCurrency, exchangeRates)
      : amount;

  const resolveDisplayCurrency = (itemCurrency: string) =>
    itemCurrency === BASE_CURRENCY ? displayCurrency : itemCurrency;

  const subtotal = items.reduce(
    (sum, item) =>
      sum + convertItemAmount(item.unitPrice, item.currency) * item.quantity,
    0,
  );
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);
  const hasNonBaseItems = items.some((item) => item.currency !== BASE_CURRENCY);
  const hasMixedCurrencies =
    new Set(items.map((item) => item.currency)).size > 1;
  const checkoutCurrency = items[0]?.currency ?? BASE_CURRENCY;
  const mixedCurrencyWarningId = "cart-drawer-mixed-currency-warning";

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-50 ${
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <button
        type="button"
        aria-label="Close cart"
        tabIndex={isOpen ? 0 : -1}
        onClick={close}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`absolute inset-y-0 right-0 flex h-full w-full max-w-md flex-col border-l border-(--line-soft) bg-paper shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-(--line-soft) px-6 py-4">
          <div>
            <h2 className="font-serif text-xl text-maroon-900">Your Cart</h2>
            <p className="text-[11px] uppercase tracking-[0.12em] text-ink-mute">
              {itemCount === 0
                ? "Empty"
                : `${itemCount} ${itemCount === 1 ? "piece" : "pieces"}`}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close cart"
            onClick={close}
            className="grid h-9 w-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-sm text-warm-gray-700">
              Your cart is currently empty.
            </p>
            <Link
              href="/products"
              onClick={close}
              className="inline-flex h-10 items-center border border-maroon-700 bg-maroon-700 px-5 text-xs font-medium uppercase tracking-[0.08em] text-white hover:bg-maroon-600"
            >
              Browse the archive
            </Link>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <ul className="space-y-5">
              {items.map((item) => {
                const lineKey = getCartLineKey(item);
                return (
                  <li
                    key={lineKey}
                    className="grid grid-cols-[80px_1fr] gap-4 border-b border-(--line-soft) pb-5 last:border-b-0 last:pb-0"
                  >
                    <div className="relative aspect-square overflow-hidden bg-bg-secondary">
                      <Image
                        src={item.imageUrl ?? "/next.svg"}
                        alt={item.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>

                    <div className="space-y-2">
                      <div>
                        <h3 className="font-serif text-base text-maroon-900">
                          {item.title}
                        </h3>
                        {item.variantTitle ? (
                          <p className="text-xs text-warm-gray-600">
                            {item.variantTitle}
                          </p>
                        ) : null}
                        {item.frame ? (
                          <p className="text-xs text-warm-gray-600">
                            Frame: {item.frame.name}
                          </p>
                        ) : null}
                      </div>

                      <p className="text-xs text-warm-gray-700">
                        {formatCurrency(
                          convertItemAmount(item.unitPrice, item.currency),
                          resolveDisplayCurrency(item.currency),
                        )}{" "}
                        each
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="inline-flex items-center border border-(--line-soft)">
                          <button
                            type="button"
                            aria-label={`Decrease ${item.title} quantity`}
                            onClick={() => {
                              const next = Math.max(1, item.quantity - 1);
                              updateQuantity(lineKey, next);
                              announceStatus(
                                `${item.title} quantity updated to ${next}.`,
                              );
                            }}
                            className="grid h-10 w-10 place-items-center text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-saffron"
                          >
                            −
                          </button>
                          <span className="grid h-10 min-w-10 place-items-center px-2 text-sm tabular-nums text-ink">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label={`Increase ${item.title} quantity`}
                            onClick={() => {
                              const next = item.quantity + 1;
                              updateQuantity(lineKey, next);
                              announceStatus(
                                `${item.title} quantity updated to ${next}.`,
                              );
                            }}
                            className="grid h-10 w-10 place-items-center text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-saffron"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            removeItem(lineKey);
                            announceStatus(`${item.title} removed from cart.`);
                          }}
                          aria-label={`Remove ${item.title} from cart`}
                          className="text-xs font-medium uppercase tracking-[0.08em] text-maroon-700 hover:text-maroon-600"
                        >
                          Remove
                        </button>
                      </div>

                      <p className="text-sm font-medium text-maroon-900">
                        {formatCurrency(
                          convertItemAmount(item.unitPrice, item.currency) *
                            item.quantity,
                          resolveDisplayCurrency(item.currency),
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {items.length > 0 ? (
          <footer className="border-t border-(--line-soft) px-6 py-5">
            <div className="flex items-center justify-between text-sm text-warm-gray-700">
              <span className="uppercase tracking-[0.08em] text-ink-mute">
                Subtotal
              </span>
              <span className="font-serif text-lg text-maroon-900">
                {formatCurrency(subtotal, displayCurrency)}
              </span>
            </div>

            {hasMixedCurrencies ? (
              <p
                id={mixedCurrencyWarningId}
                className="mt-3 text-xs text-red-700"
              >
                Your cart contains multiple currencies. Clear cart and re-add
                items in a single currency before checkout.
              </p>
            ) : hasNonBaseItems ? (
              <p className="mt-3 text-xs text-ink-mute">
                Checkout is processed in {checkoutCurrency}. Taxes and shipping
                are calculated at checkout.
              </p>
            ) : (
              <p className="mt-3 text-xs text-ink-mute">
                Taxes and shipping are calculated at checkout.
              </p>
            )}

            {hasMixedCurrencies ? (
              <button
                type="button"
                disabled
                aria-describedby={mixedCurrencyWarningId}
                className="mt-4 inline-flex h-11 w-full items-center justify-center border border-maroon-700 bg-maroon-700 px-4 text-sm font-medium uppercase tracking-[0.08em] text-white opacity-60"
              >
                Proceed to checkout
              </button>
            ) : (
              <Link
                href="/checkout"
                onClick={close}
                className="mt-4 inline-flex h-11 w-full items-center justify-center border border-maroon-700 bg-maroon-700 px-4 text-sm font-medium uppercase tracking-[0.08em] text-white hover:bg-maroon-600"
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
              className="mt-3 w-full text-xs font-medium uppercase tracking-[0.08em] text-maroon-700 hover:text-maroon-600"
            >
              Clear cart
            </button>
          </footer>
        ) : null}

        <p role="status" aria-live="polite" className="sr-only">
          {statusMessage}
        </p>
      </aside>
    </div>
  );
}
