import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Icon,
  Input,
} from "@/components/admin/ui";
import { inventoryRepository } from "@/lib/repositories/inventory-repository";

import { updateVariantInventoryAction } from "./actions";

type AdminInventoryPageProps = {
  searchParams: Promise<{ q?: string }>;
};

type InventoryTone = "success" | "warning" | "danger" | "neutral" | "muted";

function toNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function inventoryBadge(
  available: number,
  threshold: number,
): { label: string; tone: InventoryTone } {
  if (available <= 0) return { label: "Out of stock", tone: "danger" };
  if (available <= threshold) return { label: "Low stock", tone: "warning" };
  return { label: "Healthy", tone: "success" };
}

function productBadgeTone(status: string): InventoryTone {
  if (status === "active") return "success";
  if (status === "archived") return "muted";
  return "warning";
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

  const totalAvailable = rows.reduce(
    (acc, row) => acc + toNumber(row.availableQuantity),
    0,
  );
  const lowStockCount = rows.filter((row) => {
    const available = toNumber(row.availableQuantity);
    const threshold = toNumber(row.lowStockThreshold);
    return available > 0 && available <= threshold;
  }).length;
  const outOfStockCount = rows.filter(
    (row) => toNumber(row.availableQuantity) <= 0,
  ).length;

  return (
    <section className="space-y-5">
      {rows.map((row) => (
        <form
          key={`form-${row.variantId}`}
          id={`inv-${row.variantId}`}
          action={updateVariantInventoryAction}
          className="hidden"
        >
          <input type="hidden" name="variantId" value={row.variantId} />
          <input type="hidden" name="productId" value={row.productId} />
        </form>
      ))}

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className="admin-display text-2xl font-semibold"
            style={{ color: "var(--admin-text)" }}
          >
            Variant inventory
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--admin-text-soft)" }}
          >
            Track per-variant stock, reserved units, and low-stock thresholds.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <span style={{ color: "var(--admin-text-mute)" }}>
              {rows.length} {rows.length === 1 ? "variant" : "variants"}
            </span>
            <span style={{ color: "var(--admin-text-mute)" }}>·</span>
            <span style={{ color: "var(--admin-text-soft)" }}>
              {totalAvailable} available
            </span>
            {lowStockCount > 0 ? (
              <Badge tone="warning">{lowStockCount} low stock</Badge>
            ) : null}
            {outOfStockCount > 0 ? (
              <Badge tone="danger">{outOfStockCount} out</Badge>
            ) : null}
          </div>
        </div>
        <ButtonLink href="/admin/products" variant="secondary" size="md">
          ← Back to products
        </ButtonLink>
      </header>

      <Card>
        <CardBody>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <Field
              label="Search variants"
              hint="Match by product title, slug, variant name, or SKU."
              className="min-w-0 flex-1"
            >
              <div className="relative">
                <span
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--admin-text-mute)" }}
                >
                  <Icon.Search />
                </span>
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="e.g. enlightenment thangka, TT-001"
                  className="pl-9"
                />
              </div>
            </Field>
            <Button type="submit" variant="primary" size="md">
              Filter
            </Button>
            {q ? (
              <ButtonLink href="/admin/products/inventory" variant="ghost" size="md">
                Clear
              </ButtonLink>
            ) : null}
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="All variants"
          description="Edit On hand and Threshold inline, then save the row."
        />
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table
              className="min-w-full text-sm"
              style={{ color: "var(--admin-text)" }}
            >
              <caption className="sr-only">
                Product variants with editable on-hand quantities and low-stock
                thresholds.
              </caption>
              <thead>
                <tr
                  className="text-left text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{
                    color: "var(--admin-text-mute)",
                    borderBottom: "1px solid var(--admin-border)",
                    background: "var(--admin-surface-2)",
                  }}
                >
                  <th scope="col" className="px-5 py-3">
                    Product
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Variant
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    On hand
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Reserved
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Available
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Threshold
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-right"
                    aria-label="Actions"
                  />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const formId = `inv-${row.variantId}`;
                  const quantity = toNumber(row.quantity);
                  const reserved = toNumber(row.reservedQuantity);
                  const available = toNumber(row.availableQuantity);
                  const threshold = toNumber(row.lowStockThreshold);
                  const stockBadge = inventoryBadge(available, threshold);
                  const productTone = productBadgeTone(row.productStatus);
                  const isFirst = index === 0;

                  return (
                    <tr
                      key={row.variantId}
                      className="transition-colors"
                      style={{
                        borderTop: isFirst
                          ? undefined
                          : "1px solid var(--admin-border)",
                      }}
                    >
                      <th scope="row" className="px-5 py-4 text-left align-top">
                        <p
                          className="font-medium"
                          style={{ color: "var(--admin-text)" }}
                        >
                          {row.productTitle}
                        </p>
                        <p
                          className="mt-0.5 text-[11px]"
                          style={{ color: "var(--admin-text-mute)" }}
                        >
                          /{row.productSlug}
                        </p>
                      </th>
                      <td className="px-5 py-4 align-top">
                        <p
                          className="font-medium"
                          style={{ color: "var(--admin-text)" }}
                        >
                          {row.variantTitle}
                        </p>
                        <p
                          className="mt-0.5 font-mono text-[11px]"
                          style={{ color: "var(--admin-text-mute)" }}
                        >
                          {row.sku ?? "No SKU"}
                        </p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-col items-start gap-1.5">
                          <Badge tone={stockBadge.tone}>{stockBadge.label}</Badge>
                          <Badge tone={productTone}>{row.productStatus}</Badge>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top text-right">
                        <Input
                          form={formId}
                          name="quantity"
                          type="number"
                          min={0}
                          step={1}
                          defaultValue={quantity}
                          className="ml-auto h-9 w-24 text-right"
                        />
                      </td>
                      <td
                        className="px-5 py-4 align-top text-right tabular-nums"
                        style={{ color: "var(--admin-text-soft)" }}
                      >
                        {reserved}
                      </td>
                      <td
                        className="px-5 py-4 align-top text-right font-semibold tabular-nums"
                        style={{ color: "var(--admin-text)" }}
                      >
                        {available}
                      </td>
                      <td className="px-5 py-4 align-top text-right">
                        <Input
                          form={formId}
                          name="lowStockThreshold"
                          type="number"
                          min={0}
                          step={1}
                          defaultValue={threshold}
                          className="ml-auto h-9 w-24 text-right"
                        />
                      </td>
                      <td className="px-5 py-4 align-top text-right">
                        <Button
                          form={formId}
                          type="submit"
                          variant="primary"
                          size="sm"
                        >
                          Save
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <CardBody>
            <EmptyState
              icon={<Icon.Box width={28} height={28} />}
              title={q ? "No variants matched your filter." : "No variants yet."}
              description={
                q
                  ? "Try a different product title, slug, variant name, or SKU."
                  : "Create products and variants to see inventory levels here."
              }
              action={
                q ? (
                  <ButtonLink
                    href="/admin/products/inventory"
                    variant="secondary"
                    size="sm"
                  >
                    Clear filter
                  </ButtonLink>
                ) : (
                  <ButtonLink
                    href="/admin/products/new"
                    variant="primary"
                    size="sm"
                  >
                    Create product
                  </ButtonLink>
                )
              }
            />
          </CardBody>
        )}
      </Card>
    </section>
  );
}
