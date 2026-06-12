"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Badge, DataTable, type ColumnDef } from "@/components/admin/ui";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

export type OrderRow = {
  id: string;
  orderNumber: string;
  email: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  currency: string;
  grandTotal: number;
  createdAt: Date;
};

type Tone = "success" | "warning" | "danger" | "info" | "muted" | "neutral";

function statusTone(status: string): Tone {
  if (status === "delivered") return "success";
  if (status === "cancelled") return "danger";
  if (status === "processing" || status === "shipped") return "info";
  return "neutral";
}

function paymentTone(status: string): Tone {
  if (status === "paid") return "success";
  if (status === "failed" || status === "refunded") return "danger";
  return "warning";
}

export function OrdersTable({ rows }: { rows: OrderRow[] }) {
  const columns = useMemo<ColumnDef<OrderRow, unknown>[]>(
    () => [
      {
        id: "order",
        accessorKey: "orderNumber",
        header: "Order",
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              href={`/admin/orders/${row.original.id}`}
              className="font-medium hover:underline"
              style={{ color: "var(--admin-text)" }}
            >
              {row.original.orderNumber}
            </Link>
            <p
              className="mt-0.5 font-mono text-[11px]"
              style={{ color: "var(--admin-text-mute)" }}
            >
              {row.original.id.slice(0, 8)}…
            </p>
          </div>
        ),
      },
      {
        id: "customer",
        accessorKey: "email",
        header: "Customer",
        cell: ({ row }) => (
          <a
            href={`mailto:${row.original.email}`}
            className="hover:underline"
            style={{ color: "var(--admin-text-soft)" }}
          >
            {row.original.email}
          </a>
        ),
      },
      {
        id: "workflow",
        accessorKey: "status",
        header: "Workflow",
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <Badge tone={statusTone(row.original.status)}>
              {row.original.status}
            </Badge>
            <Badge tone={paymentTone(row.original.paymentStatus)}>
              {row.original.paymentStatus}
            </Badge>
            <span
              className="text-[10.5px] uppercase tracking-[0.06em]"
              style={{ color: "var(--admin-text-mute)" }}
            >
              fulfillment: {row.original.fulfillmentStatus}
            </span>
          </div>
        ),
      },
      {
        id: "total",
        accessorKey: "grandTotal",
        header: "Total",
        meta: { align: "right" },
        sortingFn: (a, b) => a.original.grandTotal - b.original.grandTotal,
        cell: ({ row }) => (
          <span
            className="font-medium tabular-nums"
            style={{ color: "var(--admin-text)" }}
          >
            {formatCurrency(row.original.grandTotal, row.original.currency)}
          </span>
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
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable<OrderRow>
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      searchPlaceholder="Search by order number, email, or status…"
      pageSize={10}
      initialSorting={[{ id: "createdAt", desc: true }]}
    />
  );
}
