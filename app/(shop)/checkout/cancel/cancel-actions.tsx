"use client";

import { useCartDrawerStore } from "@/lib/store/cart-drawer";

export function ReturnToCartButton() {
  const open = useCartDrawerStore((state) => state.open);

  return (
    <button
      type="button"
      onClick={open}
      className="inline-flex h-10 items-center border border-border-light px-4 text-xs font-medium uppercase tracking-[0.06em] text-warm-gray-700 hover:bg-bg-secondary"
    >
      Return to Cart
    </button>
  );
}
