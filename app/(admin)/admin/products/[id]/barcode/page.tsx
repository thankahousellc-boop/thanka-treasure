import { notFound } from "next/navigation";

import { FlashToast } from "@/components/admin/flash-toast";
import { Button, ButtonLink } from "@/components/admin/ui";
import { renderBarcodeSvg } from "@/lib/barcode/render";
import { productRepository } from "@/lib/repositories/product-repository";
import { formatCurrency } from "@/lib/utils/formatters";

import { regenerateProductBarcodeAction } from "../../actions";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

type AdminProductBarcodePageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminProductBarcodePage({
  params,
}: AdminProductBarcodePageProps) {
  const { id } = await params;
  const record = await productRepository.findByIdForAdmin(id);

  if (!record) {
    notFound();
  }

  const { product, primaryVariant, attributes } = record;
  const barcodeSvg = product.barcode ? renderBarcodeSvg(product.barcode) : null;
  const regenerate = regenerateProductBarcodeAction.bind(null, product.id);

  return (
    <section className="space-y-5">
      <FlashToast messages={{ regenerated: "Barcode regenerated." }} />
      <header className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h2
          className="admin-display text-2xl font-semibold"
          style={{ color: "var(--admin-text)" }}
        >
          Barcode label
        </h2>
        <div className="flex items-center gap-2">
          <ButtonLink
            href={`/admin/products/${product.id}`}
            variant="secondary"
            size="sm"
          >
            Back to product
          </ButtonLink>
          <form action={regenerate}>
            <Button type="submit" variant="secondary" size="sm">
              Regenerate
            </Button>
          </form>
          {barcodeSvg ? <PrintButton /> : null}
        </div>
      </header>

      {barcodeSvg ? (
        <div
          className="mx-auto w-[320px] space-y-2 rounded border border-(--admin-border) bg-white p-4 text-center text-black"
          style={{ color: "#000" }}
        >
          <p className="text-sm font-semibold">{product.title}</p>
          {attributes.length > 0 ? (
            <p className="text-xs">
              {attributes
                .map((entry) => entry.values.join(" · "))
                .join(" • ")}
            </p>
          ) : null}
          {primaryVariant ? (
            <p className="text-sm font-medium">
              {formatCurrency(primaryVariant.price)}
            </p>
          ) : null}
          <div
            className="flex justify-center"
            dangerouslySetInnerHTML={{ __html: barcodeSvg }}
          />
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--admin-text-soft)" }}>
          No barcode yet. Click Regenerate to build one from the current barcode
          settings.
        </p>
      )}
    </section>
  );
}
