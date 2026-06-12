import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Icon,
} from "@/components/admin/ui";
import { inventoryRepository } from "@/lib/repositories/inventory-repository";

import { InventoryTable } from "./inventory-table";

function toNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

async function loadInventoryRows() {
  try {
    return await inventoryRepository.listVariantInventoryForAdmin({ limit: 500 });
  } catch {
    return [];
  }
}

export default async function AdminProductInventoryPage() {
  const rows = await loadInventoryRows();

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
        <CardHeader
          title="All variants"
          description="Edit On hand and Threshold inline, then save the row."
        />
        {rows.length > 0 ? (
          <InventoryTable rows={rows} />
        ) : (
          <CardBody>
            <EmptyState
              icon={<Icon.Box width={28} height={28} />}
              title="No variants yet."
              description="Create products and variants to see inventory levels here."
              action={
                <ButtonLink
                  href="/admin/products/new"
                  variant="primary"
                  size="sm"
                >
                  Create product
                </ButtonLink>
              }
            />
          </CardBody>
        )}
      </Card>
    </section>
  );
}
