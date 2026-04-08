import type { ExchangeRateMap } from "@/lib/currency/convert";

export const CURRENCY_COOKIE_NAME = "tt_currency";

export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD",
  CA: "USD",
  GB: "GBP",
  IE: "EUR",
  FR: "EUR",
  DE: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  JP: "JPY",
  AU: "AUD",
  NZ: "AUD",
};

export const DEFAULT_EXCHANGE_RATES: ExchangeRateMap = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.52,
  JPY: 151,
};
