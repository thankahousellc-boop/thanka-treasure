"use client";

import { SUPPORTED_CURRENCIES } from "@/lib/currency/config";
import { convertFromUsd } from "@/lib/currency/convert";
import { formatCurrency } from "@/lib/utils/formatters";

import { useCurrency } from "@/components/shop/currency-provider";

type PriceProps = {
  // Amount in USD minor units (cents), as stored in the DB.
  cents: number | null;
  fallback?: string;
  className?: string;
};

// Renders every supported currency up front; globals.css shows only the one
// matching html[data-currency] (set pre-paint by the layout head script). This
// keeps prices correct on the very first paint of a static/ISR page — no
// hydration mismatch, no USD→local flash, no server round-trip on switch.
export function Price({
  cents,
  fallback = "Price on request",
  className,
}: PriceProps) {
  const { rates } = useCurrency();

  if (cents === null) {
    return <span className={className}>{fallback}</span>;
  }

  return (
    <span className={className} data-price>
      {SUPPORTED_CURRENCIES.map((currency) => (
        <span key={currency.code} data-price-cur={currency.code}>
          {formatCurrency(convertFromUsd(cents, currency.code, rates), currency.code)}
        </span>
      ))}
    </span>
  );
}
