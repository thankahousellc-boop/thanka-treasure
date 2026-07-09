"use client";

import Image from "next/image";

import { Icon } from "@/components/admin/ui";
import type { PosLookupResult } from "@/lib/repositories/product-repository";
import { formatCurrency } from "@/lib/utils/formatters";

function priceLabel(item: PosLookupResult) {
  const prices = item.variants.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatCurrency(min) : `from ${formatCurrency(min)}`;
}

function inStock(item: PosLookupResult) {
  return item.variants.some((v) => v.availableQuantity > 0);
}

export function ProductGrid({
  items,
  query,
  loading,
  stagedCounts,
  onQueryChange,
  onPick,
}: {
  items: PosLookupResult[];
  query: string;
  loading: boolean;
  stagedCounts: Record<string, number>;
  onQueryChange: (value: string) => void;
  onPick: (item: PosLookupResult) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--admin-text-mute)" }}
        >
          <Icon.Search width={20} height={20} />
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search products by name…"
          aria-label="Search products by name"
          className="h-12 w-full rounded-xl pl-11 pr-3 text-base placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-(--admin-accent)"
          style={{
            background: "var(--admin-surface)",
            border: "1px solid var(--admin-border-strong)",
            color: "var(--admin-text)",
          }}
        />
      </div>

      {loading ? (
        <p className="px-1 py-6 text-base" style={{ color: "var(--admin-text-mute)" }}>
          Searching…
        </p>
      ) : items.length === 0 ? (
        <p className="px-1 py-6 text-base" style={{ color: "var(--admin-text-mute)" }}>
          {query
            ? `No products match “${query}”.`
            : "No products to show yet."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => {
            const available = inStock(item);
            const staged = stagedCounts[item.productId] ?? 0;
            return (
              <button
                key={item.productId}
                type="button"
                disabled={!available}
                onClick={() => onPick(item)}
                className="group relative flex flex-col overflow-hidden rounded-xl text-left transition hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: "var(--admin-surface)",
                  border: staged
                    ? "2px solid var(--admin-accent)"
                    : "1px solid var(--admin-border)",
                  boxShadow: "var(--admin-shadow)",
                }}
              >
                {staged ? (
                  <span
                    aria-label={`${staged} selected`}
                    className="absolute right-2 top-2 z-10 grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-sm font-bold tabular-nums"
                    style={{
                      background: "var(--admin-accent)",
                      color: "var(--admin-on-accent)",
                      boxShadow: "var(--admin-shadow)",
                    }}
                  >
                    {staged}
                  </span>
                ) : null}
                <div
                  className="grid aspect-square w-full place-items-center overflow-hidden"
                  style={{ background: "var(--admin-surface-2)" }}
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.productTitle}
                      width={240}
                      height={240}
                      className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                      unoptimized
                    />
                  ) : (
                    <Icon.Image
                      width={40}
                      height={40}
                      style={{ color: "var(--admin-text-mute)" }}
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-0.5 p-2.5">
                  <p
                    className="line-clamp-2 text-sm font-medium leading-snug"
                    style={{ color: "var(--admin-text)" }}
                  >
                    {item.productTitle}
                  </p>
                  <p
                    className="mt-auto text-base font-bold tabular-nums"
                    style={{ color: "var(--admin-text)" }}
                  >
                    {priceLabel(item)}
                  </p>
                  {!available ? (
                    <p
                      className="text-xs font-medium"
                      style={{ color: "var(--admin-danger)" }}
                    >
                      Out of stock
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
