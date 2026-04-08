import Link from "next/link";

import { inventoryRepository } from "@/lib/repositories/inventory-repository";

import { updateVariantInventoryAction } from "./actions";

type AdminInventoryPageProps = {
  searchParams: Promise<{ q?: string }>;
};

function toNumber(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return value;
}

function toInventoryStatus(
  availableQuantity: number,
  lowStockThreshold: number,
) {
  if (availableQuantity <= 0) {
    return {
      label: "Out of stock",
      className: "bg-red-100 text-red-700",
    };
  }

  if (availableQuantity <= lowStockThreshold) {
    return {
      label: "Low stock",
      className: "bg-amber-100 text-amber-700",
    };
  }

  return {
    label: "Healthy",
    className: "bg-emerald-100 text-emerald-700",
  };
}

function toProductStatusClasses(status: string) {
  if (status === "active") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "archived") {
    return "bg-zinc-200 text-zinc-700";
  }

  return "bg-amber-100 text-amber-700";
}

async function loadInventoryRows(query: string) {
  try {
    return await inventoryRepository.listVariantInventoryForAdmin({
      query,
      limit: 300,
    });
  } catch {
    return [];
  }
}

export default async function AdminProductInventoryPage({
  searchParams,
}: AdminInventoryPageProps) {
  const { q = "" } = await searchParams;
  const rows = await loadInventoryRows(q);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">
            Variant inventory
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Track per-variant stock, reserved units, and low-stock thresholds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products"
            className="inline-flex h-10 items-center rounded border border-zinc-300 px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
          >
            Back to products
          </Link>
        </div>
      </div>

      <form
        className="rounded border border-zinc-200 bg-white p-4"
        method="get"
      >
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.06em] text-zinc-600">
            Search variants
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Product title, slug, variant, or SKU"
              className="h-10 min-w-70 flex-1 rounded border border-zinc-300 px-3 text-sm text-zinc-900"
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Filter
            </button>
          </div>
        </label>
      </form>

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <caption className="sr-only">
              Product variants with inventory levels, thresholds, and inline
              update controls.
            </caption>
            <thead className="bg-zinc-50">
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
                <th scope="col" className="px-4 py-3">
                  Product
                </th>
                <th scope="col" className="px-4 py-3">
                  Variant
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  On hand
                </th>
                <th scope="col" className="px-4 py-3">
                  Reserved
                </th>
                <th scope="col" className="px-4 py-3">
                  Available
                </th>
                <th scope="col" className="px-4 py-3">
                  Low-stock threshold
                </th>
                <th scope="col" className="px-4 py-3">
                  Update
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {rows.map((row) => {
                const quantity = toNumber(row.quantity);
                const reservedQuantity = toNumber(row.reservedQuantity);
                const availableQuantity = toNumber(row.availableQuantity);
                const lowStockThreshold = toNumber(row.lowStockThreshold);
                const inventoryStatus = toInventoryStatus(
                  availableQuantity,
                  lowStockThreshold,
                );

                return (
                  <tr key={row.variantId}>
                    <th scope="row" className="px-4 py-3 text-left align-top">
                      <p className="font-medium text-zinc-900">
                        {row.productTitle}
                      </p>
                      <p className="text-xs text-zinc-500">
                        /{row.productSlug}
                      </p>
                    </th>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-zinc-900">
                        {row.variantTitle}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {row.sku ?? "No SKU"}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`rounded px-2 py-1 text-xs uppercase tracking-[0.06em] ${toProductStatusClasses(row.productStatus)}`}
                        >
                          {row.productStatus}
                        </span>
                        <span
                          className={`rounded px-2 py-1 text-xs uppercase tracking-[0.06em] ${inventoryStatus.className}`}
                        >
                          {inventoryStatus.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-zinc-900">
                      {quantity}
                    </td>
                    <td className="px-4 py-3 align-top text-zinc-900">
                      {reservedQuantity}
                    </td>
                    <td className="px-4 py-3 align-top font-semibold text-zinc-900">
                      {availableQuantity}
                    </td>
                    <td className="px-4 py-3 align-top text-zinc-900">
                      {lowStockThreshold}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <form
                        action={updateVariantInventoryAction}
                        className="space-y-2"
                      >
                        <input
                          type="hidden"
                          name="variantId"
                          value={row.variantId}
                        />
                        <input
                          type="hidden"
                          name="productId"
                          value={row.productId}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <label className="space-y-1">
                            <span className="text-[11px] uppercase tracking-[0.06em] text-zinc-500">
                              On hand
                            </span>
                            <input
                              type="number"
                              name="quantity"
                              min={0}
                              step={1}
                              defaultValue={quantity}
                              className="h-9 w-24 rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[11px] uppercase tracking-[0.06em] text-zinc-500">
                              Threshold
                            </span>
                            <input
                              type="number"
                              name="lowStockThreshold"
                              min={0}
                              step={1}
                              defaultValue={lowStockThreshold}
                              className="h-9 w-24 rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                            />
                          </label>
                        </div>
                        <button
                          type="submit"
                          className="inline-flex h-9 items-center rounded border border-zinc-300 px-3 text-xs font-medium uppercase tracking-[0.06em] text-zinc-700 hover:bg-zinc-100"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          No variants matched your filter.
        </div>
      )}
    </section>
  );
}
