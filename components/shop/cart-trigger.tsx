"use client";

import { CartBadge } from "@/components/shop/cart-badge";
import { useCartDrawerStore } from "@/lib/store/cart-drawer";

export function CartTrigger() {
  const open = useCartDrawerStore((state) => state.open);

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open cart"
      className="relative grid h-9 w-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 7h14l-1.5 11a2 2 0 0 1-2 1.7H8.5a2 2 0 0 1-2-1.7L5 7Z" />
        <path d="M9 7V5a3 3 0 0 1 6 0v2" />
      </svg>
      <CartBadge />
    </button>
  );
}
