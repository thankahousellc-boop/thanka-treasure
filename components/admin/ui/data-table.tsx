"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type Table as TanstackTable,
} from "@tanstack/react-table";
import { useMemo, useState, type ReactNode } from "react";

import { Icon } from "./icons";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

type Density = "comfortable" | "compact";

type DataTableProps<TRow> = {
  columns: ColumnDef<TRow, unknown>[];
  data: TRow[];
  getRowId?: (row: TRow, index: number) => string;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof TRow | string)[];
  globalFilterFn?: (row: TRow, search: string) => boolean;
  pageSize?: number;
  pageSizeOptions?: readonly number[];
  emptyState?: ReactNode;
  initialSorting?: SortingState;
  density?: Density;
  toolbar?: ReactNode;
  rowClassName?: string;
};

function defaultGlobalFilter<TRow>(row: TRow, search: string): boolean {
  if (!search) return true;
  const needle = search.toLowerCase();

  function walk(value: unknown): boolean {
    if (value == null) return false;
    if (typeof value === "string") return value.toLowerCase().includes(needle);
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value).toLowerCase().includes(needle);
    }
    if (value instanceof Date) {
      return value.toISOString().toLowerCase().includes(needle);
    }
    if (Array.isArray(value)) {
      return value.some(walk);
    }
    if (typeof value === "object") {
      return Object.values(value as Record<string, unknown>).some(walk);
    }
    return false;
  }

  return walk(row);
}

export function DataTable<TRow>({
  columns,
  data,
  getRowId,
  enableSearch = true,
  searchPlaceholder = "Search…",
  globalFilterFn,
  pageSize = 10,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  emptyState,
  initialSorting = [],
  density = "comfortable",
  toolbar,
  rowClassName,
}: DataTableProps<TRow>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [globalFilter, setGlobalFilter] = useState("");

  const filteredData = useMemo(() => {
    if (!enableSearch || !globalFilter) return data;
    const matcher = globalFilterFn ?? defaultGlobalFilter;
    return data.filter((row) => matcher(row, globalFilter));
  }, [data, enableSearch, globalFilter, globalFilterFn]);

  const table = useReactTable<TRow>({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId,
    initialState: {
      pagination: { pageIndex: 0, pageSize },
    },
  });

  const cellPaddingY = density === "compact" ? "py-2.5" : "py-3.5";
  const cellPaddingX = density === "compact" ? "px-3.5" : "px-5";

  const hasRows = table.getRowModel().rows.length > 0;
  const totalFilteredCount = filteredData.length;
  const totalCount = data.length;

  return (
    <div className="flex flex-col">
      {(enableSearch || toolbar) ? (
        <div
          className="flex flex-wrap items-center gap-3 px-4 py-3"
          style={{
            borderBottom: "1px solid var(--admin-border)",
            background: "var(--admin-surface-2)",
          }}
        >
          {enableSearch ? (
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <span
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--admin-text-mute)" }}
              >
                <Icon.Search width={14} height={14} />
              </span>
              <input
                type="search"
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-9 w-full rounded-md pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-(--admin-accent)"
                style={{
                  background: "var(--admin-surface)",
                  border: "1px solid var(--admin-border-strong)",
                  color: "var(--admin-text)",
                }}
              />
            </div>
          ) : null}
          {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
          <div
            className="ml-auto text-[11px] tabular-nums"
            style={{ color: "var(--admin-text-mute)" }}
          >
            {globalFilter && totalFilteredCount !== totalCount
              ? `${totalFilteredCount} of ${totalCount}`
              : `${totalCount} ${totalCount === 1 ? "row" : "rows"}`}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table
          className="min-w-full text-sm"
          style={{ color: "var(--admin-text)", borderCollapse: "separate", borderSpacing: 0 }}
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="text-left text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{
                  color: "var(--admin-text-mute)",
                  borderBottom: "1px solid var(--admin-border)",
                  background: "var(--admin-surface-2)",
                }}
              >
                {headerGroup.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const sortState = header.column.getIsSorted();
                  const align = (header.column.columnDef.meta as { align?: "left" | "right" | "center" } | undefined)?.align ?? "left";
                  const alignClass =
                    align === "right"
                      ? "text-right"
                      : align === "center"
                        ? "text-center"
                        : "text-left";

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={`${cellPaddingX} ${cellPaddingY} ${alignClass}`}
                      style={{ width: header.getSize() === 150 ? undefined : header.getSize() }}
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          aria-label={`Sort by ${typeof header.column.columnDef.header === "string" ? header.column.columnDef.header : header.column.id}${sortState === "asc" ? ", ascending" : sortState === "desc" ? ", descending" : ""}`}
                          className="-mx-1 inline-flex items-center gap-1.5 rounded px-1 py-0.5 transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--admin-accent)"
                          style={{ color: "inherit" }}
                        >
                          <span>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </span>
                          <SortIndicator state={sortState} />
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {hasRows ? (
              table.getRowModel().rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={`group transition-colors ${rowClassName ?? ""}`}
                  style={{
                    borderTop:
                      index === 0
                        ? undefined
                        : "1px solid var(--admin-border)",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor =
                      "var(--admin-accent-soft)";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {row.getVisibleCells().map((cell) => {
                    const align = (cell.column.columnDef.meta as { align?: "left" | "right" | "center" } | undefined)?.align ?? "left";
                    const alignClass =
                      align === "right"
                        ? "text-right"
                        : align === "center"
                          ? "text-center"
                          : "text-left";
                    return (
                      <td
                        key={cell.id}
                        className={`${cellPaddingX} ${cellPaddingY} align-middle ${alignClass}`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className={`${cellPaddingX} py-10 text-center text-sm`}
                  style={{ color: "var(--admin-text-mute)" }}
                >
                  {emptyState ?? (
                    <span>
                      {globalFilter
                        ? "No rows match your search."
                        : "No data to display."}
                    </span>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <DataTablePagination
        table={table}
        pageSizeOptions={pageSizeOptions}
        totalFilteredCount={totalFilteredCount}
      />
    </div>
  );
}

function SortIndicator({ state }: { state: false | "asc" | "desc" }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex flex-col leading-none"
      style={{ color: "var(--admin-text-mute)" }}
    >
      <svg
        width="8"
        height="5"
        viewBox="0 0 8 5"
        fill="none"
        style={{
          opacity: state === "asc" ? 1 : 0.4,
          color: state === "asc" ? "var(--admin-accent)" : undefined,
        }}
      >
        <path d="M0 5 4 0l4 5H0Z" fill="currentColor" />
      </svg>
      <svg
        width="8"
        height="5"
        viewBox="0 0 8 5"
        fill="none"
        style={{
          marginTop: 1,
          opacity: state === "desc" ? 1 : 0.4,
          color: state === "desc" ? "var(--admin-accent)" : undefined,
        }}
      >
        <path d="m0 0 4 5 4-5H0Z" fill="currentColor" />
      </svg>
    </span>
  );
}

function DataTablePagination<TRow>({
  table,
  pageSizeOptions,
  totalFilteredCount,
}: {
  table: TanstackTable<TRow>;
  pageSizeOptions: readonly number[];
  totalFilteredCount: number;
}) {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageCount = Math.max(table.getPageCount(), 1);

  const start = totalFilteredCount === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min(totalFilteredCount, (pageIndex + 1) * pageSize);

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
      style={{
        borderTop: "1px solid var(--admin-border)",
        background: "var(--admin-surface-2)",
      }}
    >
      <div
        className="flex flex-wrap items-center gap-3 text-[11.5px]"
        style={{ color: "var(--admin-text-soft)" }}
      >
        <span className="tabular-nums">
          {totalFilteredCount === 0
            ? "0 results"
            : `${start.toLocaleString()}–${end.toLocaleString()} of ${totalFilteredCount.toLocaleString()}`}
        </span>
        <div className="flex items-center gap-2">
          <label
            htmlFor="data-table-page-size"
            style={{ color: "var(--admin-text-mute)" }}
          >
            Rows per page
          </label>
          <select
            id="data-table-page-size"
            value={pageSize}
            onChange={(event) => table.setPageSize(Number(event.target.value))}
            className="h-9 rounded-md px-2 text-xs focus:outline-none focus:ring-2 focus:ring-(--admin-accent)"
            style={{
              background: "var(--admin-surface)",
              border: "1px solid var(--admin-border-strong)",
              color: "var(--admin-text)",
            }}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <PaginationButton
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          ariaLabel="First page"
        >
          «
        </PaginationButton>
        <PaginationButton
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          ariaLabel="Previous page"
        >
          ‹
        </PaginationButton>
        <span
          className="px-2 text-[11.5px] tabular-nums"
          style={{ color: "var(--admin-text-soft)" }}
        >
          Page {pageIndex + 1} of {pageCount}
        </span>
        <PaginationButton
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          ariaLabel="Next page"
        >
          ›
        </PaginationButton>
        <PaginationButton
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!table.getCanNextPage()}
          ariaLabel="Last page"
        >
          »
        </PaginationButton>
      </div>
    </div>
  );
}

function PaginationButton({
  onClick,
  disabled,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--admin-accent) disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        background: "var(--admin-surface)",
        border: "1px solid var(--admin-border-strong)",
        color: "var(--admin-text)",
      }}
    >
      {children}
    </button>
  );
}

export type { ColumnDef } from "@tanstack/react-table";
