"use client";

import { useEffect } from "react";

import { clearStoredCheckoutSessionId } from "@/components/shop/checkout-embedded";
import { useCartStore } from "@/lib/store/cart";

export function ClearCartOnSuccess() {
  const clear = useCartStore((state) => state.clear);

  useEffect(() => {
    clear();
    // Order is placed — drop the stored session id so the next checkout starts
    // a fresh reservation instead of reusing a completed session.
    clearStoredCheckoutSessionId();
  }, [clear]);

  return null;
}
