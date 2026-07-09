"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button, Icon } from "@/components/admin/ui";
import { formatCurrency } from "@/lib/utils/formatters";

import { Barcode } from "./barcode";
import { getProductLabels, type ProductLabel } from "./label-actions";

export function LabelPrintButton({
  productIds,
  onDone,
}: {
  productIds: string[];
  onDone?: () => void;
}) {
  const [labels, setLabels] = useState<ProductLabel[] | null>(null);
  const [loading, setLoading] = useState(false);
  const count = productIds.length;

  async function handleGenerate() {
    if (count === 0) return;
    setLoading(true);
    try {
      const rows = await getProductLabels({ productIds });
      if (rows.length === 0) {
        toast.error("Selected products have no variants to label.");
        return;
      }
      setLabels(rows);
    } catch {
      toast.error("Could not generate barcodes. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setLabels(null);
    onDone?.();
  }

  return (
    <>
      <Button
        variant="secondary"
        size="md"
        onClick={handleGenerate}
        disabled={count === 0 || loading}
      >
        <Icon.Tag />
        <span>
          {loading
            ? "Preparing…"
            : `Print barcodes${count > 0 ? ` (${count})` : ""}`}
        </span>
      </Button>
      {labels ? <LabelSheet labels={labels} onClose={handleClose} /> : null}
    </>
  );
}

function LabelSheet({
  labels,
  onClose,
}: {
  labels: ProductLabel[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "var(--admin-bg)" }}
    >
      <style>{`
        @media print {
          @page { margin: 12mm; }
          body * { visibility: hidden !important; }
          .label-sheet, .label-sheet * { visibility: visible !important; }
          .label-sheet { position: absolute; inset: 0; overflow: visible; }
          .label-toolbar { display: none !important; }
        }
      `}</style>

      <div
        className="label-toolbar flex flex-wrap items-center justify-between gap-3 px-5 py-3"
        style={{
          borderBottom: "1px solid var(--admin-border)",
          background: "var(--admin-surface-2)",
        }}
      >
        <span className="text-sm" style={{ color: "var(--admin-text)" }}>
          {labels.length} {labels.length === 1 ? "label" : "labels"} ready to
          print
        </span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md" onClick={onClose}>
            <Icon.Close />
            <span>Close</span>
          </Button>
          <Button variant="primary" size="md" onClick={() => window.print()}>
            <span>Print</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div
          className="label-sheet mx-auto grid max-w-4xl gap-4"
          style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
        >
          {labels.map((label) => (
            <LabelCard key={label.variantId} label={label} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LabelCard({ label }: { label: ProductLabel }) {
  const attributes = [label.vendor, label.option1]
    .filter((value): value is string => Boolean(value))
    .join(" • ");

  return (
    <div
      className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center"
      style={{
        borderColor: "var(--admin-border)",
        background: "#ffffff",
        color: "#000000",
        breakInside: "avoid",
      }}
    >
      <p className="text-base font-bold leading-tight">{label.productTitle}</p>
      {attributes ? <p className="text-sm">{attributes}</p> : null}
      <p className="text-lg font-semibold">{formatCurrency(label.price)}</p>
      <Barcode value={label.sku} />
      <p className="font-mono text-xs tracking-widest">{label.sku}</p>
    </div>
  );
}
