"use client";

import { useSyncExternalStore } from "react";

import { useCartStore } from "@/lib/store/cart";

function subscribeToHydration(callback: () => void) {
  const unsubFinish = useCartStore.persist.onFinishHydration(callback);
  return () => {
    unsubFinish();
  };
}

function getHydrationSnapshot() {
  return useCartStore.persist.hasHydrated();
}

function getServerHydrationSnapshot() {
  return false;
}

export function CartBadge() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const count = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );

  if (!hydrated || count === 0) {
    return null;
  }

  return (
    <span
      aria-label={`${count} items in cart`}
      className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[10px] font-semibold text-paper"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
