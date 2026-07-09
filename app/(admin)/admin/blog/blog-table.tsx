"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useFormStatus } from "react-dom";

import { Badge, DataTable, type ColumnDef } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils/formatters";

import { deleteBlogPostAction } from "./actions";

function DeletePostButton({ title }: { title: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="text-xs font-medium hover:underline disabled:cursor-not-allowed disabled:opacity-60"
      style={{ color: "#b3261e" }}
      onClick={(event) => {
        if (
          !window.confirm(`Delete "${title}"? This cannot be undone.`)
        ) {
          event.preventDefault();
        }
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

export type BlogRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  viewCount: number;
};

type Tone = "success" | "warning" | "muted" | "neutral";

function statusTone(status: string): Tone {
  if (status === "published") return "success";
  if (status === "draft") return "warning";
  if (status === "archived") return "muted";
  return "neutral";
}

export function BlogTable({ rows }: { rows: BlogRow[] }) {
  const columns = useMemo<ColumnDef<BlogRow, unknown>[]>(
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
        id: "views",
        accessorKey: "viewCount",
        header: "Views",
        meta: { align: "right" },
        cell: ({ row }) => (
          <span
            className="tabular-nums"
            style={{ color: "var(--admin-text-soft)" }}
          >
            {row.original.viewCount.toLocaleString("en-US")}
          </span>
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
            {row.original.publishedAt ? formatDate(row.original.publishedAt) : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-3">
            <Link
              href={`/admin/blog/${row.original.id}`}
              className="text-sm font-medium hover:underline"
              style={{ color: "var(--admin-accent)" }}
            >
              Open →
            </Link>
            <form action={deleteBlogPostAction}>
              <input type="hidden" name="postId" value={row.original.id} />
              <DeletePostButton title={row.original.title} />
            </form>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable<BlogRow>
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      searchPlaceholder="Search posts by title or slug…"
      pageSize={10}
      initialSorting={[{ id: "published", desc: true }]}
    />
  );
}
