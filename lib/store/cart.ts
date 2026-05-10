"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { CartItem } from "@/types/cart";

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  removeItem: (lineKey: string) => void;
  clear: () => void;
};

export function getCartLineKey(
  item: Pick<CartItem, "variantId" | "frame">,
) {
  return item.frame ? `${item.variantId}::${item.frame.id}` : item.variantId;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const key = getCartLineKey(item);
          const existing = state.items.find(
            (entry) => getCartLineKey(entry) === key,
          );

          if (!existing) {
            return { items: [...state.items, item] };
          }

          return {
            items: state.items.map((entry) =>
              getCartLineKey(entry) === key
                ? { ...entry, quantity: entry.quantity + item.quantity }
                : entry,
            ),
          };
        }),
      updateQuantity: (lineKey, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter(
                (item) => getCartLineKey(item) !== lineKey,
              ),
            };
          }

          return {
            items: state.items.map((item) =>
              getCartLineKey(item) === lineKey ? { ...item, quantity } : item,
            ),
          };
        }),
      removeItem: (lineKey) =>
        set((state) => ({
          items: state.items.filter(
            (item) => getCartLineKey(item) !== lineKey,
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "thangka-cart",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
