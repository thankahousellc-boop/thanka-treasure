"use client";

import { useState } from "react";

import { useCurrency } from "@/components/shop/currency-provider";
import { SUPPORTED_CURRENCIES } from "@/lib/currency/config";

type CurrencySelectorProps = {
  className?: string;
  labelClassName?: string;
  selectClassName?: string;
};

export function CurrencySelector({
  className,
  labelClassName,
  selectClassName,
}: CurrencySelectorProps) {
  const { currency, setCurrency } = useCurrency();
  const [statusMessage, setStatusMessage] = useState("");

  return (
    <>
      <label
        className={
          className ??
          "inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em]"
        }
      >
        <span className={labelClassName ?? "text-warm-gray-500"}>Currency</span>
        <select
          aria-label="Select display currency"
          value={currency}
          onChange={(event) => {
            const nextCurrency = event.target.value.toUpperCase();
            // Client-only switch: updates the cookie + html[data-currency], and
            // CSS re-toggles every <Price> instantly. No server round-trip.
            setCurrency(nextCurrency);
            setStatusMessage(`Display currency updated to ${nextCurrency}.`);
          }}
          className={
            selectClassName ??
            "h-8 border border-border-light bg-white px-2 text-xs uppercase tracking-[0.06em] text-warm-gray-900"
          }
        >
          {SUPPORTED_CURRENCIES.map((supported) => (
            <option key={supported.code} value={supported.code}>
              {supported.code}
            </option>
          ))}
        </select>
      </label>
      <p role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </p>
    </>
  );
}
