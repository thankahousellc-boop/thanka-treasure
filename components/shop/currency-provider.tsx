"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";

import { BASE_CURRENCY } from "@/lib/currency/config";
import { CURRENCY_COOKIE_NAME } from "@/lib/currency/constants";
import type { ExchangeRateMap } from "@/lib/currency/convert";

type CurrencyContextValue = {
  // Live selected currency. Only consumers that must react to a switch — cart
  // storage, cart drawer — read this. Static display prices use <Price>, which
  // is currency-state-independent (CSS toggle → no flash).
  currency: string;
  rates: ExchangeRateMap;
  setCurrency: (next: string) => void;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

// The cookie is the source of truth. We expose it to React via
// useSyncExternalStore: server snapshot is the base currency (matches static
// HTML), client snapshot reads the cookie — no hydration mismatch, no effect.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function readCookieCurrency(): string {
  if (typeof document === "undefined") {
    return BASE_CURRENCY;
  }

  const match = document.cookie.match(/(?:^|;\s*)tt_currency=([^;]+)/);
  return match ? decodeURIComponent(match[1]).toUpperCase() : BASE_CURRENCY;
}

function getServerSnapshot() {
  return BASE_CURRENCY;
}

export function CurrencyProvider({
  rates,
  children,
}: {
  rates: ExchangeRateMap;
  children: React.ReactNode;
}) {
  const currency = useSyncExternalStore(
    subscribe,
    readCookieCurrency,
    getServerSnapshot,
  );

  const setCurrency = useCallback((next: string) => {
    const normalized = next.toUpperCase();
    document.documentElement.dataset.currency = normalized;
    document.cookie = `${CURRENCY_COOKIE_NAME}=${normalized}; Path=/; Max-Age=31536000; SameSite=Lax`;
    listeners.forEach((listener) => listener());
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, rates, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider.");
  }
  return context;
}
