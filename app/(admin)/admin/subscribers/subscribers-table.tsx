"use client";

import { useMemo } from "react";

import {
  Badge,
  DataTable,
  SubmitButton,
  type ColumnDef,
} from "@/components/admin/ui";
import { formatDate } from "@/lib/utils/formatters";

import { updateSubscriberStatus } from "./actions";

export type SubscriberRow = {
  id: string;
  email: string;
  status: string;
  source: string;
  subscribedAt: Date;
  unsubscribedAt: Date | null;
};

type Tone = "success" | "warning" | "muted" | "neutral";

function statusTone(status: string): Tone {
  if (status === "active") return "success";
  if (status === "unsubscribed") return "warning";
  return "neutral";
}

export function SubscribersTable({ rows }: { rows: SubscriberRow[] }) {
  const columns = useMemo<ColumnDef<SubscriberRow, unknown>[]>(
    () => [
      {
        id: "email",
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span
            className="font-medium"
            style={{ color: "var(--admin-text)" }}
          >
            {row.original.email}
          </span>
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
        id: "source",
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => (
          <span
            className="text-[11.5px] uppercase tracking-[0.06em]"
            style={{ color: "var(--admin-text-soft)" }}
          >
            {row.original.source}
          </span>
        ),
      },
      {
        id: "subscribed",
        accessorKey: "subscribedAt",
        header: "Subscribed",
        sortingFn: (a, b) =>
          a.original.subscribedAt.getTime() -
          b.original.subscribedAt.getTime(),
        cell: ({ row }) => (
          <span
            className="text-xs"
            style={{ color: "var(--admin-text-soft)" }}
          >
            {formatDate(row.original.subscribedAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) => (
          <form action={updateSubscriberStatus}>
            <input type="hidden" name="email" value={row.original.email} />
            <input
              type="hidden"
              name="status"
              value={
                row.original.status === "active" ? "unsubscribed" : "active"
              }
            />
            <SubmitButton size="sm" variant="secondary" pendingLabel="Updating…">
              {row.original.status === "active" ? "Unsubscribe" : "Reactivate"}
            </SubmitButton>
          </form>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable<SubscriberRow>
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      searchPlaceholder="Search by email or source…"
      pageSize={10}
      initialSorting={[{ id: "subscribed", desc: true }]}
    />
  );
}
