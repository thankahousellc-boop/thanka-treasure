"use client";

import Image from "next/image";

import { Icon } from "@/components/admin/ui";
import { formatCurrency } from "@/lib/utils/formatters";

import type { CartLine } from "./types";

function lineName(line: CartLine) {
  return line.variantTitle && line.variantTitle !== "Default"
    ? `${line.productTitle} — ${line.variantTitle}`
    : line.productTitle;
}

export function CartPanel({
  lines,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  lines: CartLine[];
  onIncrease: (variantId: string) => void;
  onDecrease: (variantId: string) => void;
  onRemove: (variantId: string) => void;
}) {
  if (lines.length === 0) {
    return (
      <div
        className="grid place-items-center rounded-xl px-6 py-10 text-center"
        style={{
          background: "var(--admin-surface-2)",
          border: "1px dashed var(--admin-border-strong)",
        }}
      >
        <Icon.Bag
          width={32}
          height={32}
          style={{ color: "var(--admin-text-mute)" }}
        />
        <p
          className="mt-2 text-base font-medium"
          style={{ color: "var(--admin-text-soft)" }}
        >
          Cart is empty
        </p>
        <p className="mt-0.5 text-sm" style={{ color: "var(--admin-text-mute)" }}>
          Scan a barcode to begin.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {lines.map((line) => {
        const atStockLimit = line.quantity >= line.availableQuantity;
        return (
          <li
            key={line.variantId}
            className="flex items-center gap-2.5 rounded-xl p-2.5"
            style={{
              background: "var(--admin-surface)",
              border: "1px solid var(--admin-border)",
            }}
          >
            <div
              className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg"
              style={{ background: "var(--admin-surface-2)" }}
            >
              {line.imageUrl ? (
                <Image
                  src={line.imageUrl}
                  alt={line.productTitle}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <Icon.Image
                  width={18}
                  height={18}
                  style={{ color: "var(--admin-text-mute)" }}
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-medium"
                style={{ color: "var(--admin-text)" }}
                title={lineName(line)}
              >
                {lineName(line)}
              </p>
              <p
                className="text-xs tabular-nums"
                style={{ color: "var(--admin-text-mute)" }}
              >
                {formatCurrency(line.unitPrice)} ·{" "}
                <span className="font-semibold" style={{ color: "var(--admin-text-soft)" }}>
                  {formatCurrency(line.unitPrice * line.quantity)}
                </span>
              </p>
            </div>

            {/* Quantity stepper — kept at touch size */}
            <div className="flex items-center gap-1">
              <QtyButton
                label={`Remove one ${line.productTitle}`}
                onClick={() => onDecrease(line.variantId)}
              >
                <Icon.Minus width={18} height={18} />
              </QtyButton>
              <span
                className="w-7 text-center text-base font-bold tabular-nums"
                style={{ color: "var(--admin-text)" }}
              >
                {line.quantity}
              </span>
              <QtyButton
                label={`Add one ${line.productTitle}`}
                onClick={() => onIncrease(line.variantId)}
                disabled={atStockLimit}
              >
                <Icon.Plus width={18} height={18} />
              </QtyButton>
            </div>

            <button
              type="button"
              aria-label={`Remove ${line.productTitle} from cart`}
              onClick={() => onRemove(line.variantId)}
              className="grid h-10 w-9 shrink-0 place-items-center rounded-lg transition hover:bg-(--admin-accent-soft)"
              style={{ color: "var(--admin-danger)" }}
            >
              <Icon.Trash width={18} height={18} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function QtyButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-10 w-10 place-items-center rounded-lg transition hover:bg-(--admin-accent-soft) disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        color: "var(--admin-text)",
        border: "1px solid var(--admin-border-strong)",
      }}
    >
      {children}
    </button>
  );
}
