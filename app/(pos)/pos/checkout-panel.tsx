"use client";

import { useState } from "react";

import { Icon } from "@/components/admin/ui";
import { formatCurrency } from "@/lib/utils/formatters";

import type { PaymentMethod } from "./types";

// Hide the native number-input spinner arrows (Chrome/Safari + Firefox).
const NO_SPINNER =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0";

const PAYMENTS: { key: PaymentMethod; label: string; icon: keyof typeof Icon }[] =
  [
    { key: "cash", label: "Cash", icon: "Cash" },
    { key: "card", label: "Card", icon: "Card" },
  ];

export function CheckoutPanel({
  subtotal,
  discount,
  discountMode,
  discountMinor,
  grandTotal,
  paymentMethod,
  cashReceived,
  changeDueMinor,
  customerName,
  customerEmail,
  onDiscountChange,
  onDiscountModeChange,
  onPaymentMethodChange,
  onCashReceivedChange,
  onCustomerNameChange,
  onCustomerEmailChange,
}: {
  subtotal: number;
  discount: string;
  discountMode: "amount" | "percent";
  discountMinor: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  cashReceived: string;
  changeDueMinor: number | null;
  customerName: string;
  customerEmail: string;
  onDiscountChange: (value: string) => void;
  onDiscountModeChange: (value: "amount" | "percent") => void;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  onCashReceivedChange: (value: string) => void;
  onCustomerNameChange: (value: string) => void;
  onCustomerEmailChange: (value: string) => void;
}) {
  const [showCustomer, setShowCustomer] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);

  const shortCash =
    paymentMethod === "cash" &&
    changeDueMinor !== null &&
    changeDueMinor < 0;

  return (
    <div className="space-y-3">
      {/* Totals */}
      <div className="space-y-1.5">
        <Row label="Subtotal" value={formatCurrency(subtotal)} />
        {discountMinor > 0 ? (
          <Row
            label="Discount"
            value={`−${formatCurrency(discountMinor)}`}
            muted
          />
        ) : null}
        <div
          className="flex items-center justify-between border-t pt-2"
          style={{ borderColor: "var(--admin-border)" }}
        >
          <span
            className="text-base font-semibold"
            style={{ color: "var(--admin-text)" }}
          >
            Total
          </span>
          <span
            className="text-2xl font-bold tabular-nums"
            style={{ color: "var(--admin-text)" }}
          >
            {formatCurrency(grandTotal)}
          </span>
        </div>
      </div>

      {/* Discount (collapsed by default to keep things calm) */}
      {showDiscount ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-medium"
              style={{ color: "var(--admin-text-soft)" }}
            >
              Discount
            </span>
            {/* $ / % segmented toggle */}
            <div
              className="flex overflow-hidden rounded-md"
              style={{ border: "1px solid var(--admin-border-strong)" }}
            >
              {(["amount", "percent"] as const).map((mode) => {
                const active = discountMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onDiscountModeChange(mode)}
                    className="h-7 w-8 text-sm font-semibold transition"
                    style={{
                      background: active
                        ? "var(--admin-accent)"
                        : "transparent",
                      color: active
                        ? "var(--admin-on-accent)"
                        : "var(--admin-text-soft)",
                    }}
                  >
                    {mode === "amount" ? "$" : "%"}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="relative">
            <input
              type="number"
              min={0}
              step={discountMode === "percent" ? "1" : "0.01"}
              inputMode="decimal"
              value={discount}
              onChange={(event) => onDiscountChange(event.target.value)}
              onWheel={(event) => event.currentTarget.blur()}
              placeholder={discountMode === "percent" ? "0" : "0.00"}
              aria-label={
                discountMode === "percent"
                  ? "Discount percent"
                  : "Discount amount in dollars"
              }
              className={`h-11 w-full rounded-lg pl-3 pr-24 text-base tabular-nums focus:outline-none focus:ring-2 focus:ring-(--admin-accent) ${NO_SPINNER}`}
              style={{
                background: "var(--admin-surface)",
                border: "1px solid var(--admin-border-strong)",
                color: "var(--admin-text)",
              }}
            />
            {discountMinor > 0 ? (
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold tabular-nums"
                style={{ color: "var(--admin-text-soft)" }}
              >
                −{formatCurrency(discountMinor)}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowDiscount(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium"
          style={{ color: "var(--admin-accent-strong)" }}
        >
          <Icon.Discount width={16} height={16} />
          Add a discount
        </button>
      )}

      {/* Payment method */}
      <div className="space-y-1.5">
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--admin-text-mute)" }}
        >
          Payment
        </span>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENTS.map((p) => {
            const active = paymentMethod === p.key;
            const PayIcon = Icon[p.icon];
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => onPaymentMethodChange(p.key)}
                className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-sm font-semibold transition"
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
                <PayIcon width={18} height={18} />
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cash handling */}
      {paymentMethod === "cash" ? (
        <div
          className="space-y-2 rounded-lg p-2.5"
          style={{ background: "var(--admin-surface-2)" }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--admin-text-mute)" }}
          >
            Cash received
          </span>

          <div className="relative">
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={cashReceived}
              onChange={(event) => onCashReceivedChange(event.target.value)}
              onWheel={(event) => event.currentTarget.blur()}
              placeholder="Type amount given"
              aria-label="Cash received"
              className={`h-12 w-full rounded-lg pl-3 pr-20 text-lg font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-(--admin-accent) ${NO_SPINNER}`}
              style={{
                background: "var(--admin-surface)",
                border: "1px solid var(--admin-border-strong)",
                color: "var(--admin-text)",
              }}
            />
            <button
              type="button"
              onClick={() =>
                onCashReceivedChange((grandTotal / 100).toFixed(2))
              }
              className="absolute right-1.5 top-1/2 h-9 -translate-y-1/2 rounded-md px-3 text-sm font-semibold transition hover:brightness-110"
              style={{
                background: "var(--admin-accent-soft)",
                color: "var(--admin-accent-strong)",
              }}
            >
              Exact
            </button>
          </div>

          {changeDueMinor !== null ? (
            <div
              className="flex items-center justify-between rounded-lg px-3 py-2"
              style={{
                background: shortCash
                  ? "var(--admin-surface)"
                  : "var(--admin-accent-soft)",
              }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--admin-text)" }}
              >
                {shortCash ? "Still owed" : "Change due"}
              </span>
              <span
                className="text-2xl font-bold tabular-nums"
                style={{
                  color: shortCash
                    ? "var(--admin-danger)"
                    : "var(--admin-success)",
                }}
              >
                {formatCurrency(Math.abs(changeDueMinor))}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Optional customer */}
      {showCustomer ? (
        <div className="space-y-2">
          <input
            value={customerName}
            onChange={(event) => onCustomerNameChange(event.target.value)}
            placeholder="Customer name (optional)"
            aria-label="Customer name"
            className="h-11 w-full rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-(--admin-accent)"
            style={{
              background: "var(--admin-surface)",
              border: "1px solid var(--admin-border-strong)",
              color: "var(--admin-text)",
            }}
          />
          <input
            type="email"
            value={customerEmail}
            onChange={(event) => onCustomerEmailChange(event.target.value)}
            placeholder="Customer email (optional)"
            aria-label="Customer email"
            className="h-11 w-full rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-(--admin-accent)"
            style={{
              background: "var(--admin-surface)",
              border: "1px solid var(--admin-border-strong)",
              color: "var(--admin-text)",
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCustomer(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium"
          style={{ color: "var(--admin-accent-strong)" }}
        >
          <Icon.Users width={16} height={16} />
          Add customer details
        </button>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span style={{ color: "var(--admin-text-soft)" }}>{label}</span>
      <span
        className="tabular-nums"
        style={{ color: muted ? "var(--admin-text-soft)" : "var(--admin-text)" }}
      >
        {value}
      </span>
    </div>
  );
}
