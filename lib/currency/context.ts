import { unstable_cache } from "next/cache";
import { cache } from "react";
import { cookies, headers } from "next/headers";

import { BASE_CURRENCY, SUPPORTED_CURRENCIES } from "@/lib/currency/config";
import {
  CURRENCY_COOKIE_NAME,
  COUNTRY_TO_CURRENCY,
  DEFAULT_EXCHANGE_RATES,
} from "@/lib/currency/constants";
import { convertFromUsd, type ExchangeRateMap } from "@/lib/currency/convert";
import { settingsRepository } from "@/lib/repositories/settings-repository";

const SUPPORTED_CURRENCY_CODES = new Set(
  SUPPORTED_CURRENCIES.map((currency) => currency.code),
);

function normalizeCurrencyCode(input: string | null | undefined) {
  if (!input) {
    return null;
  }

  const normalized = input.trim().toUpperCase();
  return SUPPORTED_CURRENCY_CODES.has(normalized) ? normalized : null;
}

function resolveCurrencyFromCountry(countryCode: string | null | undefined) {
  if (!countryCode) {
    return BASE_CURRENCY;
  }

  return COUNTRY_TO_CURRENCY[countryCode.trim().toUpperCase()] ?? BASE_CURRENCY;
}

function sanitizeExchangeRates(
  configuredRates: Record<string, unknown> | null,
): ExchangeRateMap {
  const sanitized: ExchangeRateMap = { ...DEFAULT_EXCHANGE_RATES };

  if (configuredRates) {
    for (const [code, rawRate] of Object.entries(configuredRates)) {
      const normalizedCode = normalizeCurrencyCode(code);
      const rate = typeof rawRate === "number" ? rawRate : Number(rawRate);

      if (normalizedCode && Number.isFinite(rate) && rate > 0) {
        sanitized[normalizedCode] = rate;
      }
    }
  }

  sanitized[BASE_CURRENCY] = 1;
  return sanitized;
}

const loadExchangeRates = unstable_cache(
  async () => {
    const configuredRates =
      await settingsRepository.get<Record<string, unknown>>("exchange_rates");

    return sanitizeExchangeRates(configuredRates);
  },
  ["exchange_rates"],
  { tags: ["settings:exchange_rates"], revalidate: 3600 },
);

const readExchangeRates = cache(loadExchangeRates);

export async function getExchangeRates() {
  return readExchangeRates();
}

export async function resolveDisplayCurrency() {
  const [cookieStore, headersList] = await Promise.all([cookies(), headers()]);

  const cookieCurrency = normalizeCurrencyCode(
    cookieStore.get(CURRENCY_COOKIE_NAME)?.value,
  );

  if (cookieCurrency) {
    return cookieCurrency;
  }

  const geoCountry =
    headersList.get("x-vercel-ip-country") ?? headersList.get("cf-ipcountry");
  return resolveCurrencyFromCountry(geoCountry);
}

export async function getCurrencyContext() {
  const [currency, rates] = await Promise.all([
    resolveDisplayCurrency(),
    getExchangeRates(),
  ]);

  return { currency, rates };
}

export function convertUsdToCurrency(
  amountInUsdCents: number,
  currency: string,
  rates: ExchangeRateMap,
) {
  return convertFromUsd(amountInUsdCents, currency, rates);
}
