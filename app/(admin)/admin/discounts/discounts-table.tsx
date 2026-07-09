"use client";

import { useMemo } from "react";

import {
  Badge,
  DataTable,
  SubmitButton,
  type ColumnDef,
} from "@/components/admin/ui";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

import { toggleDiscountStatusAction } from "./actions";

export type DiscountRow = {
  id: string;
  code: string;
  type: string;
  value: number;
  minimumOrderAmount: number | null;
  usageLimit: number | null;
  usageCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  appliesTo: unknown;
  createdAt: Date;
};

function formatDiscountValue(discount: DiscountRow) {
  if (discount.type === "percentage") {
    return `${discount.value}%`;
  }

  if (discount.type === "fixed_amount") {
    return formatCurrency(discount.value);
  }

  if (discount.minimumOrderAmount !== null) {
    return `Free shipping over ${formatCurrency(discount.minimumOrderAmount)}`;
  }

  return "Free shipping";
}

function readApplyMode(appliesTo: unknown) {
  if (!appliesTo || typeof appliesTo !== "object") {
    return { mode: "code" as const, priority: null as number | null };
  }

  const record = appliesTo as Record<string, unknown>;
  return {
    mode:
      record.mode === "automatic" ? ("automatic" as const) : ("code" as const),
    priority:
      typeof record.priority === "number" && Number.isFinite(record.priority)
        ? record.priority
        : null,
  };
}

function formatValidityWindow(discount: DiscountRow) {
  if (!discount.startsAt && !discount.endsAt) {
    return "Always active";
  }

  if (discount.startsAt && !discount.endsAt) {
    return `From ${formatDate(discount.startsAt)}`;
  }

  if (!discount.startsAt && discount.endsAt) {
    return `Until ${formatDate(discount.endsAt)}`;
  }

  return `${formatDate(discount.startsAt as Date)} → ${formatDate(discount.endsAt as Date)}`;
}

export function DiscountsTable({ rows }: { rows: DiscountRow[] }) {
  const columns = useMemo<ColumnDef<DiscountRow, unknown>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p
              className="font-mono text-[13px] font-medium"
              style={{ color: "var(--admin-text)" }}
            >
              {row.original.code}
            </p>
            <p
              className="mt-0.5 text-[11px]"
              style={{ color: "var(--admin-text-mute)" }}
            >
              Created {formatDate(row.original.createdAt)}
            </p>
          </div>
        ),
      },
      {
        id: "value",
        accessorKey: "value",
        header: "Type and value",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p
              className="font-medium"
              style={{ color: "var(--admin-text)" }}
            >
              {formatDiscountValue(row.original)}
            </p>
            <p
              className="text-[10.5px] uppercase tracking-[0.06em]"
              style={{ color: "var(--admin-text-mute)" }}
            >
              {row.original.type.replaceAll("_", " ")}
            </p>
          </div>
        ),
      },
      {
        id: "apply",
        accessorFn: (row) => readApplyMode(row.appliesTo).mode,
        header: "Apply mode",
        cell: ({ row }) => {
          const apply = readApplyMode(row.original.appliesTo);
          return (
            <div className="min-w-0">
              <Badge tone={apply.mode === "automatic" ? "info" : "muted"}>
                {apply.mode}
              </Badge>
              {apply.priority !== null ? (
                <p
                  className="mt-1 text-[11px]"
                  style={{ color: "var(--admin-text-mute)" }}
                >
                  Priority {apply.priority}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "rules",
        header: "Rules",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p
              className="text-[12px]"
              style={{ color: "var(--admin-text-soft)" }}
            >
              {formatValidityWindow(row.original)}
            </p>
            {row.original.minimumOrderAmount !== null ? (
              <p
                className="text-[11px]"
                style={{ color: "var(--admin-text-mute)" }}
              >
                Min order {formatCurrency(row.original.minimumOrderAmount)}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "usage",
        accessorKey: "usageCount",
        header: "Usage",
        meta: { align: "right" },
        cell: ({ row }) => (
          <div className="min-w-0">
            <p
              className="font-medium tabular-nums"
              style={{ color: "var(--admin-text)" }}
            >
              {row.original.usageCount}
            </p>
            <p
              className="text-[11px]"
              style={{ color: "var(--admin-text-mute)" }}
            >
              {row.original.usageLimit !== null
                ? `${row.original.usageLimit} limit`
                : "no limit"}
            </p>
          </div>
        ),
      },
      {
        id: "status",
        accessorFn: (row) => (row.isActive ? "active" : "inactive"),
        header: "Status",
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-2">
            <Badge tone={row.original.isActive ? "success" : "muted"}>
              {row.original.isActive ? "active" : "inactive"}
            </Badge>
            <form action={toggleDiscountStatusAction}>
              <input type="hidden" name="id" value={row.original.id} />
              <input
                type="hidden"
                name="nextState"
                value={row.original.isActive ? "inactive" : "active"}
              />
              <SubmitButton size="sm" variant="secondary" pendingLabel="…">
                {row.original.isActive ? "Deactivate" : "Activate"}
              </SubmitButton>
            </form>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable<DiscountRow>
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      searchPlaceholder="Search by code or type…"
      pageSize={10}
      initialSorting={[{ id: "code", desc: false }]}
    />
  );
}
