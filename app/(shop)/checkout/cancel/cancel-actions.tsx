"use client";

import { useCartDrawerStore } from "@/lib/store/cart-drawer";

export function ReturnToCartButton() {
  const open = useCartDrawerStore((state) => state.open);

  return (
    <button
      type="button"
      onClick={open}
      className="inline-flex h-10 items-center border border-paper-3 px-4 text-xs font-medium uppercase tracking-[0.06em] text-ink-soft hover:bg-paper-2"
    >
      Return to Cart
    </button>
  );
}
