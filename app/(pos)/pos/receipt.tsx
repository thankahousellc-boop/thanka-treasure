"use client";

import { formatCurrency } from "@/lib/utils/formatters";

import type { CompletedSale } from "./types";

function lineName(productTitle: string, variantTitle: string | null) {
  return variantTitle && variantTitle !== "Default"
    ? `${productTitle} — ${variantTitle}`
    : productTitle;
}

const PAYMENT_LABEL: Record<CompletedSale["paymentMethod"], string> = {
  cash: "Cash",
  card: "Card",
  other: "Other",
};

// Rendered off-screen; only the receipt is made visible during print() so it
// works on a standard or roll/thermal printer regardless of the kiosk theme.
export function Receipt({
  sale,
  brandName,
}: {
  sale: CompletedSale;
  brandName: string;
}) {
  return (
    <div className="pos-receipt-root" aria-hidden="true">
      <style>{`
        .pos-receipt-root {
          position: fixed;
          left: -10000px;
          top: 0;
          background: #fff;
          color: #000;
          width: 300px;
          padding: 16px;
          font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
          font-size: 12px;
          line-height: 1.5;
        }
        .pos-receipt-root h1 { font-size: 16px; margin: 0 0 2px; text-align: center; }
        .pos-receipt-root .muted { color: #000; text-align: center; }
        .pos-receipt-root hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
        .pos-receipt-root .row { display: flex; justify-content: space-between; gap: 8px; }
        .pos-receipt-root .item { margin-bottom: 4px; }
        .pos-receipt-root .total { font-weight: 700; font-size: 14px; }
        @media print {
          body * { visibility: hidden !important; }
          .pos-receipt-root, .pos-receipt-root * { visibility: visible !important; }
          .pos-receipt-root { left: 0 !important; width: 100%; max-width: 320px; }
        }
      `}</style>

      <h1>{brandName}</h1>
      <p className="muted">Sales receipt</p>
      <p className="muted">{sale.orderNumber}</p>
      <p className="muted">{sale.soldAt}</p>
      <hr />

      {sale.lines.map((line) => (
        <div key={line.variantId} className="item">
          <div>{lineName(line.productTitle, line.variantTitle)}</div>
          <div className="row">
            <span>
              {line.quantity} × {formatCurrency(line.unitPrice)}
            </span>
            <span>{formatCurrency(line.unitPrice * line.quantity)}</span>
          </div>
        </div>
      ))}

      <hr />
      <div className="row">
        <span>Subtotal</span>
        <span>{formatCurrency(sale.subtotal)}</span>
      </div>
      {sale.discountMinor > 0 ? (
        <div className="row">
          <span>Discount</span>
          <span>−{formatCurrency(sale.discountMinor)}</span>
        </div>
      ) : null}
      <div className="row total">
        <span>Total</span>
        <span>{formatCurrency(sale.grandTotal)}</span>
      </div>
      <hr />

      <div className="row">
        <span>Paid by</span>
        <span>{PAYMENT_LABEL[sale.paymentMethod]}</span>
      </div>
      {sale.cashReceivedMinor !== null ? (
        <div className="row">
          <span>Cash</span>
          <span>{formatCurrency(sale.cashReceivedMinor)}</span>
        </div>
      ) : null}
      {sale.changeDueMinor !== null && sale.changeDueMinor > 0 ? (
        <div className="row">
          <span>Change</span>
          <span>{formatCurrency(sale.changeDueMinor)}</span>
        </div>
      ) : null}

      <hr />
      <p className="muted">Thank you!</p>
    </div>
  );
}
