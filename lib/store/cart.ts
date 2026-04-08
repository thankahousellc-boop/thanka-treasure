"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { CartItem } from "@/types/cart";

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (entry) => entry.variantId === item.variantId,
          );

          if (!existing) {
            return { items: [...state.items, item] };
          }

          return {
            items: state.items.map((entry) =>
              entry.variantId === item.variantId
                ? { ...entry, quantity: entry.quantity + item.quantity }
                : entry,
            ),
          };
        }),
      updateQuantity: (variantId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((item) => item.variantId !== variantId),
            };
          }

          return {
            items: state.items.map((item) =>
              item.variantId === variantId ? { ...item, quantity } : item,
            ),
          };
        }),
      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((item) => item.variantId !== variantId),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "thangka-cart",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
