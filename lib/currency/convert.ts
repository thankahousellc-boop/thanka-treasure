import { BASE_CURRENCY } from "@/lib/currency/config";

export type ExchangeRateMap = Record<string, number>;

export function convertFromUsd(
  amountInUsdCents: number,
  targetCurrency: string,
  rates: ExchangeRateMap,
) {
  if (targetCurrency === BASE_CURRENCY) {
    return amountInUsdCents;
  }

  const rate = rates[targetCurrency];
  if (!rate || rate <= 0) {
    return amountInUsdCents;
  }

  return Math.round(amountInUsdCents * rate);
}
