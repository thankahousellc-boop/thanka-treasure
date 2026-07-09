import { redirect } from "next/navigation";

import { renderBarcodeSvg } from "@/lib/barcode/render";
import { productRepository } from "@/lib/repositories/product-repository";
import { formatCurrency } from "@/lib/utils/formatters";

import { PrintControls } from "./print-controls";

type LabelsPageProps = {
  searchParams: Promise<{ ids?: string | string[] }>;
};

function parseIds(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const value = Array.isArray(raw) ? raw.join(",") : raw;
  return [
    ...new Set(
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];
}

export default async function ProductLabelsPage({
  searchParams,
}: LabelsPageProps) {
  const params = await searchParams;
  const ids = parseIds(params.ids);

  if (ids.length === 0) {
    redirect("/admin/products");
  }

  const labels = await productRepository.barcodeLabelsForProducts(ids);

  return (
    <main className="min-h-screen bg-white p-6 text-black">
      {/* Print isolation: only the label sheet reaches the printer, so the
          admin chrome (sidebar/header) and the toolbar are stripped. */}
      <style>{`
        @media print {
          @page { margin: 10mm; }
          body * { visibility: hidden !important; }
          .label-sheet, .label-sheet * { visibility: visible !important; }
          .label-sheet { position: absolute; inset: 0; }
          .print-hidden { display: none !important; }
        }
      `}</style>

      <div className="print-hidden mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {labels.length} {labels.length === 1 ? "label" : "labels"} ready
        </p>
        <PrintControls autoPrint={labels.length > 0} />
      </div>

      {labels.length === 0 ? (
        <p className="text-sm text-black/60">
          No printable products found for this selection.
        </p>
      ) : (
        <div
          className="label-sheet grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          }}
        >
          {labels.map((label) => (
            <div
              key={label.id}
              className="space-y-2 rounded border p-4 text-center"
              style={{ borderColor: "rgba(0,0,0,0.15)", breakInside: "avoid" }}
            >
              <p className="text-sm font-semibold leading-tight">
                {label.title}
              </p>
              {label.attributeLine ? (
                <p className="text-xs">{label.attributeLine}</p>
              ) : null}
              {label.price != null ? (
                <p className="text-sm font-medium">
                  {formatCurrency(label.price)}
                </p>
              ) : null}
              <div
                className="flex justify-center"
                dangerouslySetInnerHTML={{
                  __html: renderBarcodeSvg(label.barcode),
                }}
              />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
