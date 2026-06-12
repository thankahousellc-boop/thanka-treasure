"use client";

import { useMemo } from "react";

import { Badge, DataTable, type ColumnDef } from "@/components/admin/ui";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

export type CustomerRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  totalOrders: number;
  totalSpent: number;
  acceptsMarketing: boolean;
  createdAt: Date;
};

function displayName(row: CustomerRow) {
  if (row.firstName || row.lastName) {
    return `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim();
  }
  return "Unnamed customer";
}

export function CustomersTable({ rows }: { rows: CustomerRow[] }) {
  const columns = useMemo<ColumnDef<CustomerRow, unknown>[]>(
    () => [
      {
        id: "customer",
        accessorFn: (row) => displayName(row),
        header: "Customer",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p
              className="font-medium"
              style={{ color: "var(--admin-text)" }}
            >
              {displayName(row.original)}
            </p>
            <a
              href={`mailto:${row.original.email}`}
              className="text-[11.5px] hover:underline"
              style={{ color: "var(--admin-text-soft)" }}
            >
              {row.original.email}
            </a>
            {row.original.phone ? (
              <p
                className="text-[11px]"
                style={{ color: "var(--admin-text-mute)" }}
              >
                {row.original.phone}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "orders",
        accessorKey: "totalOrders",
        header: "Orders",
        meta: { align: "right" },
        cell: ({ row }) => (
          <span
            className="font-medium tabular-nums"
            style={{ color: "var(--admin-text)" }}
          >
            {row.original.totalOrders}
          </span>
        ),
      },
      {
        id: "spend",
        accessorKey: "totalSpent",
        header: "Lifetime spend",
        meta: { align: "right" },
        sortingFn: (a, b) => a.original.totalSpent - b.original.totalSpent,
        cell: ({ row }) => (
          <span
            className="tabular-nums"
            style={{ color: "var(--admin-text-soft)" }}
          >
            {formatCurrency(row.original.totalSpent)}
          </span>
        ),
      },
      {
        id: "marketing",
        accessorFn: (row) => (row.acceptsMarketing ? "yes" : "no"),
        header: "Marketing",
        cell: ({ row }) =>
          row.original.acceptsMarketing ? (
            <Badge tone="success">Subscribed</Badge>
          ) : (
            <Badge tone="muted">Not subscribed</Badge>
          ),
      },
      {
        id: "joined",
        accessorKey: "createdAt",
        header: "Joined",
        sortingFn: (a, b) =>
          a.original.createdAt.getTime() - b.original.createdAt.getTime(),
        cell: ({ row }) => (
          <span
            className="text-xs"
            style={{ color: "var(--admin-text-soft)" }}
          >
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable<CustomerRow>
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      searchPlaceholder="Search customers by name, email, or phone…"
      pageSize={10}
      initialSorting={[{ id: "spend", desc: true }]}
    />
  );
}
