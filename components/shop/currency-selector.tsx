"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

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
  const [value, setValue] = useState(selectedCurrency);
  const [statusMessage, setStatusMessage] = useState("");
  const didMountRef = useRef(false);

  useEffect(() => {
    setValue(selectedCurrency);

    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    setStatusMessage(
      `Display currency updated to ${selectedCurrency.toUpperCase()}.`,
    );
    const clearTimer = window.setTimeout(() => setStatusMessage(""), 1500);
    return () => window.clearTimeout(clearTimer);
  }, [selectedCurrency]);

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
            setValue(nextCurrency);
            setStatusMessage(`Updating display currency to ${nextCurrency}.`);

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
