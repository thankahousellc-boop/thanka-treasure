"use client";

import { useMemo } from "react";

import { Badge, DataTable, type ColumnDef } from "@/components/admin/ui";

import { BulkBarcodeButton } from "./bulk-barcode-button";
import { ProductRowMenu } from "./product-row-menu";

export type ProductRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  createdAt: Date;
  inventoryCount: number;
};

type ProductStatus = "draft" | "active" | "archived";
type StatusTone = "success" | "muted" | "warning";

function statusTone(status: string): StatusTone {
  if (status === "active") return "success";
  if (status === "archived") return "muted";
  return "warning";
}

function toProductStatus(status: string): ProductStatus {
  if (status === "active" || status === "archived") return status;
  return "draft";
}

function stockTone(count: number): StatusTone {
  if (count <= 0) return "warning";
  if (count <= 5) return "muted";
  return "success";
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function ProductsTable({ rows }: { rows: ProductRow[] }) {
  const columns = useMemo<ColumnDef<ProductRow, unknown>[]>(
    () => [
      {
        id: "title",
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p
              className="font-medium"
              style={{ color: "var(--admin-text)" }}
            >
              {row.original.title}
            </p>
            <p
              className="mt-0.5 text-[11px]"
              style={{ color: "var(--admin-text-mute)" }}
            >
              /{row.original.slug}
            </p>
          </div>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={statusTone(row.original.status)}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "inventoryCount",
        accessorKey: "inventoryCount",
        header: "Stock",
        sortingFn: (a, b) =>
          a.original.inventoryCount - b.original.inventoryCount,
        cell: ({ row }) => (
          <Badge tone={stockTone(row.original.inventoryCount)}>
            {row.original.inventoryCount}
          </Badge>
        ),
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Created",
        sortingFn: (a, b) =>
          a.original.createdAt.getTime() - b.original.createdAt.getTime(),
        cell: ({ row }) => (
          <span
            className="text-xs"
            style={{ color: "var(--admin-text-soft)" }}
          >
            {dateFormatter.format(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) => (
          <ProductRowMenu
            productId={row.original.id}
            productTitle={row.original.title}
            status={toProductStatus(row.original.status)}
          />
        ),
      },
    ],
    [],
  );

  return (
    <DataTable<ProductRow>
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      enableRowSelection
      searchPlaceholder="Search by title or slug…"
      pageSize={10}
      initialSorting={[{ id: "createdAt", desc: true }]}
      toolbar={({ selectedRows }) => (
        <BulkBarcodeButton productIds={selectedRows.map((row) => row.id)} />
      )}
    />
  );
}
