"use client";

import { useMemo } from "react";

import { DataTable, type ColumnDef } from "@/components/admin/ui";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

export type TopProductRow = {
  title: string;
  quantitySold: number;
  revenue: number;
};

export type TopBlogPostRow = {
  title: string;
  slug: string;
  publishedAt: Date | null;
  viewCount: number;
};

export function TopProductsTable({ rows }: { rows: TopProductRow[] }) {
  const columns = useMemo<ColumnDef<TopProductRow, unknown>[]>(
    () => [
      {
        id: "title",
        accessorKey: "title",
        header: "Top products",
        cell: ({ row }) => (
          <span
            className="font-medium"
            style={{ color: "var(--admin-text)" }}
          >
            {row.original.title}
          </span>
        ),
      },
      {
        id: "units",
        accessorKey: "quantitySold",
        header: "Units sold",
        meta: { align: "right" },
        cell: ({ row }) => (
          <span
            className="tabular-nums"
            style={{ color: "var(--admin-text-soft)" }}
          >
            {row.original.quantitySold.toLocaleString("en-US")}
          </span>
        ),
      },
      {
        id: "revenue",
        accessorKey: "revenue",
        header: "Revenue",
        meta: { align: "right" },
        cell: ({ row }) => (
          <span
            className="font-medium tabular-nums"
            style={{ color: "var(--admin-text)" }}
          >
            {formatCurrency(row.original.revenue)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable<TopProductRow>
      columns={columns}
      data={rows}
      getRowId={(row, index) => `${row.title}-${index}`}
      enableSearch={false}
      pageSize={10}
      initialSorting={[{ id: "revenue", desc: true }]}
      emptyState="No paid order activity yet."
    />
  );
}

export function TopPostsTable({ rows }: { rows: TopBlogPostRow[] }) {
  const columns = useMemo<ColumnDef<TopBlogPostRow, unknown>[]>(
    () => [
      {
        id: "title",
        accessorKey: "title",
        header: "Popular posts",
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
        id: "published",
        accessorFn: (row) => row.publishedAt?.getTime() ?? 0,
        header: "Published",
        cell: ({ row }) => (
          <span
            className="text-xs"
            style={{ color: "var(--admin-text-soft)" }}
          >
            {row.original.publishedAt
              ? formatDate(row.original.publishedAt)
              : "—"}
          </span>
        ),
      },
      {
        id: "views",
        accessorKey: "viewCount",
        header: "Views",
        meta: { align: "right" },
        cell: ({ row }) => (
          <span
            className="font-medium tabular-nums"
            style={{ color: "var(--admin-text)" }}
          >
            {row.original.viewCount.toLocaleString("en-US")}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable<TopBlogPostRow>
      columns={columns}
      data={rows}
      getRowId={(row) => row.slug}
      enableSearch={false}
      pageSize={10}
      initialSorting={[{ id: "views", desc: true }]}
      emptyState="No published blog analytics yet."
    />
  );
}
