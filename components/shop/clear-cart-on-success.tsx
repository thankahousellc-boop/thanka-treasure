"use client";

import { useEffect } from "react";

import { useCartStore } from "@/lib/store/cart";

export function ClearCartOnSuccess() {
  const clear = useCartStore((state) => state.clear);

  useEffect(() => {
    clear();
  }, [clear]);

  return null;
}
