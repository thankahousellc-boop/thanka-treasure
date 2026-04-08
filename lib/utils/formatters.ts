import { SUPPORTED_CURRENCIES } from "@/lib/currency/config";

const CURRENCY_LOCALE_MAP = new Map(
  SUPPORTED_CURRENCIES.map((currency) => [currency.code, currency.locale]),
);

export function formatCurrency(amountInMinorUnits: number, currency = "USD") {
  const normalizedCurrency = currency.toUpperCase();

  return new Intl.NumberFormat(
    CURRENCY_LOCALE_MAP.get(normalizedCurrency) ?? "en-US",
    {
      style: "currency",
      currency: normalizedCurrency,
    },
  ).format(amountInMinorUnits / 100);
}

export function formatDate(input: Date | string) {
  const date = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  }).format(date);
}
