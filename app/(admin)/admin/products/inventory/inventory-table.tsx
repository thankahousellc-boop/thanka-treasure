"use client";

import { useMemo } from "react";

import {
  Badge,
  Button,
  DataTable,
  Input,
  type ColumnDef,
} from "@/components/admin/ui";

import { updateVariantInventoryAction } from "./actions";

export type InventoryRow = {
  productId: string;
  productTitle: string;
  productSlug: string;
  productStatus: string;
  variantId: string;
  variantTitle: string;
  sku: string | null;
  quantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  availableQuantity: number;
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

export function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  const columns = useMemo<ColumnDef<InventoryRow, unknown>[]>(
    () => [
      {
        id: "product",
        accessorFn: (row) => row.productTitle,
        header: "Product",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p
              className="font-medium"
              style={{ color: "var(--admin-text)" }}
            >
              {row.original.productTitle}
            </p>
            <p
              className="mt-0.5 text-[11px]"
              style={{ color: "var(--admin-text-mute)" }}
            >
              /{row.original.productSlug}
            </p>
          </div>
        ),
      },
      {
        id: "variant",
        accessorFn: (row) => row.variantTitle,
        header: "Variant",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p
              className="font-medium"
              style={{ color: "var(--admin-text)" }}
            >
              {row.original.variantTitle}
            </p>
            <p
              className="mt-0.5 font-mono text-[11px]"
              style={{ color: "var(--admin-text-mute)" }}
            >
              {row.original.sku ?? "No SKU"}
            </p>
          </div>
        ),
      },
      {
        id: "status",
        accessorFn: (row) =>
          inventoryBadge(
            toNumber(row.availableQuantity),
            toNumber(row.lowStockThreshold),
          ).label,
        header: "Status",
        cell: ({ row }) => {
          const available = toNumber(row.original.availableQuantity);
          const threshold = toNumber(row.original.lowStockThreshold);
          const stock = inventoryBadge(available, threshold);
          return (
            <div className="flex flex-col items-start gap-1.5">
              <Badge tone={stock.tone}>{stock.label}</Badge>
              <Badge tone={productBadgeTone(row.original.productStatus)}>
                {row.original.productStatus}
              </Badge>
            </div>
          );
        },
      },
      {
        id: "onHand",
        accessorKey: "quantity",
        header: "On hand",
        meta: { align: "right" },
        cell: ({ row }) => (
          <Input
            form={`inv-${row.original.variantId}`}
            name="quantity"
            type="number"
            min={0}
            step={1}
            defaultValue={toNumber(row.original.quantity)}
            className="ml-auto h-9 w-24 text-right"
          />
        ),
      },
      {
        id: "reserved",
        accessorKey: "reservedQuantity",
        header: "Reserved",
        meta: { align: "right" },
        cell: ({ row }) => (
          <span
            className="tabular-nums"
            style={{ color: "var(--admin-text-soft)" }}
          >
            {toNumber(row.original.reservedQuantity)}
          </span>
        ),
      },
      {
        id: "available",
        accessorKey: "availableQuantity",
        header: "Available",
        meta: { align: "right" },
        cell: ({ row }) => (
          <span
            className="font-semibold tabular-nums"
            style={{ color: "var(--admin-text)" }}
          >
            {toNumber(row.original.availableQuantity)}
          </span>
        ),
      },
      {
        id: "threshold",
        accessorKey: "lowStockThreshold",
        header: "Threshold",
        meta: { align: "right" },
        cell: ({ row }) => (
          <Input
            form={`inv-${row.original.variantId}`}
            name="lowStockThreshold"
            type="number"
            min={0}
            step={1}
            defaultValue={toNumber(row.original.lowStockThreshold)}
            className="ml-auto h-9 w-24 text-right"
          />
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) => (
          <Button
            form={`inv-${row.original.variantId}`}
            type="submit"
            variant="primary"
            size="sm"
          >
            Save
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <>
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
      <DataTable<InventoryRow>
        columns={columns}
        data={rows}
        getRowId={(row) => row.variantId}
        searchPlaceholder="Search variants by product, slug, or SKU…"
        pageSize={10}
        initialSorting={[{ id: "available", desc: false }]}
      />
    </>
  );
}
