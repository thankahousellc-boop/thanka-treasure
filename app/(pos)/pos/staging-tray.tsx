"use client";

import Image from "next/image";

import { Icon } from "@/components/admin/ui";
import { formatCurrency } from "@/lib/utils/formatters";

import type { StagedLine } from "./types";

function variantName(title: string | null) {
  return title && title !== "Default" ? title : "Standard";
}

export function StagingTray({
  lines,
  onSetVariant,
  onSetQuantity,
  onRemove,
  onClear,
  onConfirm,
}: {
  lines: StagedLine[];
  onSetVariant: (key: string, variantId: string) => void;
  onSetQuantity: (key: string, quantity: number) => void;
  onRemove: (key: string) => void;
  onClear: () => void;
  onConfirm: () => void;
}) {
  const totalItems = lines.reduce((sum, line) => sum + line.quantity, 0);
  const needsChoice = lines.some((line) => line.variantId === null);

  return (
    <section
      aria-label="Items to add"
      className="overflow-hidden rounded-xl"
      style={{
        background: "var(--admin-surface)",
        border: "2px solid var(--admin-accent)",
        boxShadow: "var(--admin-shadow)",
      }}
    >
      <header
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid var(--admin-border)" }}
      >
        <h2
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--admin-text-soft)" }}
        >
          To add · {totalItems}
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium transition hover:bg-(--admin-accent-soft)"
          style={{ color: "var(--admin-text-soft)" }}
        >
          <Icon.Close width={15} height={15} />
          Clear
        </button>
      </header>

      <ul
        className="max-h-[32vh] divide-y overflow-y-auto"
        style={{ borderColor: "var(--admin-border)" }}
      >
        {lines.map((line) => {
          const { result } = line;
          const multi = result.variants.length > 1;
          const selected =
            result.variants.find((v) => v.variantId === line.variantId) ?? null;
          const unitPrice = selected?.price ?? null;

          return (
            <li key={line.key} className="p-2.5">
              <div className="flex items-center gap-2.5">
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg"
                  style={{ background: "var(--admin-surface-2)" }}
                >
                  {result.imageUrl ? (
                    <Image
                      src={result.imageUrl}
                      alt={result.productTitle}
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
                    title={result.productTitle}
                  >
                    {result.productTitle}
                  </p>
                  {!multi ? (
                    <p
                      className="text-xs tabular-nums"
                      style={{ color: "var(--admin-text-mute)" }}
                    >
                      {unitPrice !== null ? formatCurrency(unitPrice) : ""} ·{" "}
                      {selected?.availableQuantity ?? 0} in stock
                    </p>
                  ) : line.variantId === null ? (
                    <p
                      className="text-xs font-medium"
                      style={{ color: "var(--admin-saffron)" }}
                    >
                      Pick an option ↓
                    </p>
                  ) : (
                    <p
                      className="truncate text-xs tabular-nums"
                      style={{ color: "var(--admin-text-mute)" }}
                    >
                      {variantName(selected?.title ?? null)} ·{" "}
                      {unitPrice !== null ? formatCurrency(unitPrice) : ""}
                    </p>
                  )}
                </div>

                {/* Compact qty stepper */}
                <div className="flex items-center gap-1">
                  <StepBtn
                    label="Decrease quantity"
                    onClick={() => onSetQuantity(line.key, line.quantity - 1)}
                  >
                    <Icon.Minus width={16} height={16} />
                  </StepBtn>
                  <span
                    className="w-6 text-center text-base font-bold tabular-nums"
                    style={{ color: "var(--admin-text)" }}
                  >
                    {line.quantity}
                  </span>
                  <StepBtn
                    label="Increase quantity"
                    onClick={() => onSetQuantity(line.key, line.quantity + 1)}
                  >
                    <Icon.Plus width={16} height={16} />
                  </StepBtn>
                </div>

                <button
                  type="button"
                  aria-label={`Remove ${result.productTitle}`}
                  onClick={() => onRemove(line.key)}
                  className="grid h-9 w-8 shrink-0 place-items-center rounded-md transition hover:bg-(--admin-accent-soft)"
                  style={{ color: "var(--admin-text-mute)" }}
                >
                  <Icon.Close width={16} height={16} />
                </button>
              </div>

              {/* Variant chips only when there's a real choice */}
              {multi ? (
                <div className="mt-2 flex flex-wrap gap-1.5 pl-12">
                  {result.variants.map((variant) => {
                    const active = variant.variantId === line.variantId;
                    const out = variant.availableQuantity <= 0;
                    return (
                      <button
                        key={variant.variantId}
                        type="button"
                        disabled={out}
                        onClick={() => onSetVariant(line.key, variant.variantId)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
                        style={{
                          border: active
                            ? "2px solid var(--admin-accent)"
                            : "1px solid var(--admin-border-strong)",
                          background: active
                            ? "var(--admin-accent-soft)"
                            : "transparent",
                          color: "var(--admin-text)",
                        }}
                      >
                        {variantName(variant.title)}
                        <span style={{ color: "var(--admin-text-soft)" }}>
                          {formatCurrency(variant.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <footer
        className="p-2.5"
        style={{ borderTop: "1px solid var(--admin-border)" }}
      >
        <button
          type="button"
          onClick={onConfirm}
          disabled={needsChoice || totalItems === 0}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg text-base font-bold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: "var(--admin-accent)",
            color: "var(--admin-on-accent)",
          }}
        >
          <Icon.Check width={20} height={20} />
          {needsChoice ? "Pick options above" : `Add ${totalItems} to cart`}
        </button>
      </footer>
    </section>
  );
}

function StepBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-md transition hover:bg-(--admin-accent-soft)"
      style={{
        color: "var(--admin-text)",
        border: "1px solid var(--admin-border-strong)",
      }}
    >
      {children}
    </button>
  );
}
