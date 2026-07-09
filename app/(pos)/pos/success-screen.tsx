"use client";

import { Icon } from "@/components/admin/ui";
import { formatCurrency } from "@/lib/utils/formatters";

import type { CompletedSale } from "./types";

export function SuccessScreen({
  sale,
  onPrint,
  onNewSale,
}: {
  sale: CompletedSale;
  onPrint: () => void;
  onNewSale: () => void;
}) {
  const showChange =
    sale.changeDueMinor !== null && sale.changeDueMinor > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sale complete"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "color-mix(in srgb, var(--admin-bg) 80%, black)" }}
    >
      <div
        className="w-full max-w-lg rounded-3xl p-8 text-center"
        style={{
          background: "var(--admin-surface)",
          border: "1px solid var(--admin-border)",
          boxShadow: "var(--admin-shadow-lg)",
        }}
      >
        <div
          className="mx-auto grid h-20 w-20 place-items-center rounded-full"
          style={{
            background: "var(--admin-success)",
            color: "#fff",
          }}
        >
          <Icon.Check width={44} height={44} />
        </div>

        <h2
          className="mt-5 text-3xl font-bold"
          style={{ color: "var(--admin-text)" }}
        >
          Sale complete
        </h2>
        <p className="mt-1 text-lg" style={{ color: "var(--admin-text-soft)" }}>
          Order {sale.orderNumber}
        </p>
        <p
          className="mt-1 text-xl font-semibold tabular-nums"
          style={{ color: "var(--admin-text)" }}
        >
          {formatCurrency(sale.grandTotal)} paid
        </p>

        {showChange ? (
          <div
            className="mx-auto mt-5 max-w-xs rounded-2xl px-5 py-4"
            style={{ background: "var(--admin-accent-soft)" }}
          >
            <p
              className="text-base font-semibold uppercase tracking-wide"
              style={{ color: "var(--admin-text-soft)" }}
            >
              Change due
            </p>
            <p
              className="mt-1 text-5xl font-bold tabular-nums"
              style={{ color: "var(--admin-success)" }}
            >
              {formatCurrency(sale.changeDueMinor as number)}
            </p>
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex h-16 items-center justify-center gap-2 rounded-2xl text-lg font-semibold transition hover:bg-(--admin-accent-soft)"
            style={{
              color: "var(--admin-text)",
              border: "1px solid var(--admin-border-strong)",
            }}
          >
            <Icon.Printer width={24} height={24} />
            Print receipt
          </button>
          <button
            type="button"
            autoFocus
            onClick={onNewSale}
            className="inline-flex h-16 items-center justify-center gap-2 rounded-2xl text-lg font-bold transition hover:brightness-110"
            style={{
              background: "var(--admin-accent)",
              color: "var(--admin-on-accent)",
            }}
          >
            <Icon.Plus width={24} height={24} />
            New sale
          </button>
        </div>
      </div>
    </div>
  );
}
