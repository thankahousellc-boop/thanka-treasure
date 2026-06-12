"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { SUPPORTED_CURRENCIES } from "@/lib/currency/config";
import { CURRENCY_COOKIE_NAME } from "@/lib/currency/constants";

type CurrencySelectorProps = {
  selectedCurrency: string;
  className?: string;
  labelClassName?: string;
  selectClassName?: string;
};

export function CurrencySelector({
  selectedCurrency,
  className,
  labelClassName,
  selectClassName,
}: CurrencySelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticValue, setOptimisticValue] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const value = optimisticValue ?? selectedCurrency;

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
          aria-busy={isPending}
          value={value}
          onChange={(event) => {
            const nextCurrency = event.target.value.toUpperCase();
            setOptimisticValue(nextCurrency);
            setStatusMessage(
              `Display currency updated to ${nextCurrency}.`,
            );

            document.cookie = `${CURRENCY_COOKIE_NAME}=${nextCurrency}; Path=/; Max-Age=31536000; SameSite=Lax`;
            startTransition(() => {
              router.refresh();
            });
          }}
          disabled={isPending}
          className={
            selectClassName ??
            "h-8 border border-border-light bg-white px-2 text-xs uppercase tracking-[0.06em] text-warm-gray-900"
          }
        >
          {SUPPORTED_CURRENCIES.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.code}
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
