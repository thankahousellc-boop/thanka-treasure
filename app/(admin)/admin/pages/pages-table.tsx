"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Badge, DataTable, type ColumnDef } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils/formatters";

export type PageRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  updatedAt: Date;
  createdAt: Date;
};

type Tone = "success" | "warning" | "muted" | "neutral";

function statusTone(status: string): Tone {
  if (status === "published") return "success";
  if (status === "draft") return "warning";
  if (status === "archived") return "muted";
  return "neutral";
}

export function PagesTable({ rows }: { rows: PageRow[] }) {
  const columns = useMemo<ColumnDef<PageRow, unknown>[]>(
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
              /pages/{row.original.slug}
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
        id: "updated",
        accessorKey: "updatedAt",
        header: "Updated",
        sortingFn: (a, b) =>
          a.original.updatedAt.getTime() - b.original.updatedAt.getTime(),
        cell: ({ row }) => (
          <span
            className="text-xs"
            style={{ color: "var(--admin-text-soft)" }}
          >
            {formatDate(row.original.updatedAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) => (
          <Link
            href={`/admin/pages/${row.original.id}`}
            className="text-sm font-medium hover:underline"
            style={{ color: "var(--admin-accent)" }}
          >
            Open →
          </Link>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable<PageRow>
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      searchPlaceholder="Search by title or slug…"
      pageSize={10}
      initialSorting={[{ id: "updated", desc: true }]}
    />
  );
}
