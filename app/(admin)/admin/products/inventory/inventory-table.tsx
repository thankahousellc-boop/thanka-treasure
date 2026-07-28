"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import {
  Badge,
  Button,
  DataTable,
  Icon,
  Input,
  Thumb,
  type ColumnDef,
} from "@/components/admin/ui";

import { updateProductInventoryAction } from "./actions";

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
  imageUrl: string | null;
};

type InventoryTone = "success" | "warning" | "danger" | "neutral" | "muted";

type ProductGroup = {
  productId: string;
  productTitle: string;
  productSlug: string;
  productStatus: string;
  imageUrl: string | null;
  variants: InventoryRow[];
  onHand: number;
  reserved: number;
  available: number;
  lowCount: number;
  outCount: number;
};

type VariantDraft = { quantity: string; threshold: string };

function toNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function parseField(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
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

function groupRows(rows: InventoryRow[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>();
  for (const row of rows) {
    let group = map.get(row.productId);
    if (!group) {
      group = {
        productId: row.productId,
        productTitle: row.productTitle,
        productSlug: row.productSlug,
        productStatus: row.productStatus,
        imageUrl: row.imageUrl,
        variants: [],
        onHand: 0,
        reserved: 0,
        available: 0,
        lowCount: 0,
        outCount: 0,
      };
      map.set(row.productId, group);
    }
    // Prefer any variant that carries a product image for the thumbnail.
    if (!group.imageUrl && row.imageUrl) group.imageUrl = row.imageUrl;
    group.variants.push(row);
    const available = toNumber(row.availableQuantity);
    const threshold = toNumber(row.lowStockThreshold);
    group.onHand += toNumber(row.quantity);
    group.reserved += toNumber(row.reservedQuantity);
    group.available += available;
    if (available <= 0) group.outCount += 1;
    else if (available <= threshold) group.lowCount += 1;
  }
  return [...map.values()];
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function GroupStatus({ group }: { group: ProductGroup }) {
  const rollup: { label: string; tone: InventoryTone } =
    group.outCount > 0
      ? { label: `${group.outCount} out of stock`, tone: "danger" }
      : group.lowCount > 0
        ? { label: `${group.lowCount} low stock`, tone: "warning" }
        : { label: "Healthy", tone: "success" };
  return (
    <div className="flex min-w-26 flex-col items-start gap-1.5">
      <Badge tone={rollup.tone} className="whitespace-nowrap">
        {rollup.label}
      </Badge>
      <Badge tone={productBadgeTone(group.productStatus)} className="whitespace-nowrap">
        {group.productStatus}
      </Badge>
    </div>
  );
}

// ---- Slide-over editor ----

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="flex-1 rounded-md px-3 py-2"
      style={{ background: "var(--admin-surface)", border: "1px solid var(--admin-border)" }}
    >
      <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--admin-text-mute)" }}>
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums" style={{ color: "var(--admin-text)" }}>
        {value}
      </p>
    </div>
  );
}

function VariantEditor({
  variant,
  draft,
  autoFocus,
  onChange,
}: {
  variant: InventoryRow;
  draft: VariantDraft;
  autoFocus: boolean;
  onChange: (field: "quantity" | "threshold", value: string) => void;
}) {
  const reserved = toNumber(variant.reservedQuantity);
  const available = parseField(draft.quantity) - reserved;
  const stock = inventoryBadge(available, parseField(draft.threshold));
  const savedAvailable = toNumber(variant.availableQuantity);
  const changed = available !== savedAvailable;

  return (
    <div
      className="rounded-lg p-3.5"
      style={{ background: "var(--admin-surface-2)", border: "1px solid var(--admin-border)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium" style={{ color: "var(--admin-text)" }}>
            {variant.variantTitle}
          </p>
          <p className="mt-0.5 font-mono text-[11px]" style={{ color: "var(--admin-text-mute)" }}>
            {variant.sku ?? "No SKU"}
          </p>
        </div>
        <Badge tone={stock.tone} className="shrink-0 whitespace-nowrap">
          {stock.label}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-[11px] font-medium" style={{ color: "var(--admin-text-soft)" }}>
            On hand
          </span>
          <Input
            type="number"
            min={0}
            step={1}
            value={draft.quantity}
            onChange={(event) => onChange("quantity", event.target.value)}
            autoFocus={autoFocus}
            aria-label={`On hand quantity for ${variant.variantTitle}`}
            className="text-right tabular-nums"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium" style={{ color: "var(--admin-text-soft)" }}>
            Low-stock threshold
          </span>
          <Input
            type="number"
            min={0}
            step={1}
            value={draft.threshold}
            onChange={(event) => onChange("threshold", event.target.value)}
            aria-label={`Low-stock threshold for ${variant.variantTitle}`}
            className="text-right tabular-nums"
          />
        </label>
      </div>

      <div
        className="mt-3 flex items-center gap-4 text-[11.5px] tabular-nums"
        style={{ color: "var(--admin-text-mute)" }}
      >
        <span>
          Reserved <span style={{ color: "var(--admin-text-soft)" }}>{reserved}</span>
        </span>
        <span>
          Available{" "}
          <span
            className="font-semibold"
            style={{ color: changed ? "var(--admin-accent)" : "var(--admin-text-soft)" }}
            title={changed ? `Was ${savedAvailable} · unsaved` : undefined}
          >
            {available}
          </span>
        </span>
      </div>
    </div>
  );
}

function EditPanel({
  group,
  onClose,
  onSaved,
}: {
  group: ProductGroup;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [entered, setEntered] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, VariantDraft>>(() => {
    const initial: Record<string, VariantDraft> = {};
    for (const v of group.variants) {
      initial[v.variantId] = {
        quantity: String(toNumber(v.quantity)),
        threshold: String(toNumber(v.lowStockThreshold)),
      };
    }
    return initial;
  });

  const baseline = useMemo(() => {
    const map: Record<string, VariantDraft> = {};
    for (const v of group.variants) {
      map[v.variantId] = {
        quantity: String(toNumber(v.quantity)),
        threshold: String(toNumber(v.lowStockThreshold)),
      };
    }
    return map;
  }, [group]);

  const dirtyIds = useMemo(() => {
    const ids: string[] = [];
    for (const v of group.variants) {
      const d = drafts[v.variantId];
      const b = baseline[v.variantId];
      if (!d || !b) continue;
      if (parseField(d.quantity) !== parseField(b.quantity)) ids.push(v.variantId);
      else if (parseField(d.threshold) !== parseField(b.threshold)) ids.push(v.variantId);
    }
    return ids;
  }, [drafts, baseline, group]);

  const isDirty = dirtyIds.length > 0;

  // The panel is portaled to <body>, outside the .admin-app theme scope, so
  // re-establish the admin CSS variables (and current light/dark theme) on a
  // display:contents wrapper — it supplies the vars without painting a box
  // that would cover the scrim.
  const panelTheme = useMemo(() => {
    const shell = document.querySelector<HTMLElement>(".admin-app");
    return (
      shell?.getAttribute("data-theme") ??
      document.documentElement.getAttribute("data-theme") ??
      undefined
    );
  }, []);

  // Animate in on the frame after mount; exit animation runs on close.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const requestClose = useCallback(() => {
    if (saving) return;
    if (isDirty && !window.confirm("Discard unsaved inventory changes?")) return;
    setEntered(false);
    window.setTimeout(onClose, 200);
  }, [saving, isDirty, onClose]);

  // Esc to dismiss + lock background scroll while open.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [requestClose]);

  function setField(variantId: string, field: "quantity" | "threshold", value: string) {
    setDrafts((prev) => ({ ...prev, [variantId]: { ...prev[variantId], [field]: value } }));
  }

  async function handleSave() {
    if (!isDirty || saving) return;
    setSaving(true);
    const items = group.variants.map((v) => ({
      variantId: v.variantId,
      quantity: parseField(drafts[v.variantId]?.quantity ?? "0"),
      lowStockThreshold: parseField(drafts[v.variantId]?.threshold ?? "0"),
    }));

    const result = await updateProductInventoryAction({ productId: group.productId, items });
    if (result.ok) {
      toast.success(
        dirtyIds.length === 1
          ? "Inventory saved."
          : `Inventory saved for ${dirtyIds.length} variants.`,
      );
      setEntered(false);
      window.setTimeout(() => {
        onSaved();
        onClose();
      }, 200);
    } else {
      toast.error(result.error);
      setSaving(false);
    }
  }

  const panel = (
    <div
      className="admin-app fixed inset-0 z-100"
      data-theme={panelTheme}
      style={{ background: "transparent" }}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit inventory — ${group.productTitle}`}
    >
      <div
        className="absolute inset-0 transition-opacity duration-200 motion-reduce:transition-none"
        style={{ background: "rgba(0,0,0,0.5)", opacity: entered ? 1 : 0 }}
        onClick={requestClose}
      />
      <div
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col shadow-2xl transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{
          background: "var(--admin-bg)",
          borderLeft: "1px solid var(--admin-border)",
          transform: entered ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid var(--admin-border)" }}
        >
          <Thumb src={group.imageUrl} alt={group.productTitle} size={48} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold" style={{ color: "var(--admin-text)" }}>
              {group.productTitle}
            </h3>
            <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--admin-text-mute)" }}>
              /{group.productSlug} · {group.variants.length}{" "}
              {group.variants.length === 1 ? "variant" : "variants"}
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md transition hover:bg-(--admin-accent-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--admin-accent)"
            style={{ color: "var(--admin-text-soft)" }}
          >
            <Icon.Close width={16} height={16} />
          </button>
        </div>

        {/* Scrollable variant list */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="flex gap-2">
            <StatPill label="On hand" value={group.onHand} />
            <StatPill label="Reserved" value={group.reserved} />
            <StatPill label="Available" value={group.available} />
          </div>
          {group.variants.map((variant, index) => (
            <VariantEditor
              key={variant.variantId}
              variant={variant}
              draft={drafts[variant.variantId]}
              autoFocus={index === 0}
              onChange={(field, value) => setField(variant.variantId, field, value)}
            />
          ))}
        </div>

        {/* Sticky footer */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-4"
          style={{ borderTop: "1px solid var(--admin-border)", background: "var(--admin-surface-2)" }}
        >
          <span className="text-[12px]" style={{ color: "var(--admin-text-mute)" }}>
            {isDirty
              ? `${dirtyIds.length} ${dirtyIds.length === 1 ? "variant" : "variants"} changed`
              : "No changes"}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" onClick={requestClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleSave} disabled={!isDirty || saving}>
              {saving ? (
                <>
                  <Spinner />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}

export function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  const groups = useMemo(() => groupRows(rows), [rows]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeGroup = useMemo(
    () => groups.find((group) => group.productId === activeId) ?? null,
    [groups, activeId],
  );

  const columns = useMemo<ColumnDef<ProductGroup, unknown>[]>(
    () => [
      {
        id: "product",
        accessorFn: (group) => group.productTitle,
        header: "Product",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <Thumb src={row.original.imageUrl} alt={row.original.productTitle} />
            <div className="min-w-0">
              <p className="font-medium" style={{ color: "var(--admin-text)" }}>
                {row.original.productTitle}
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: "var(--admin-text-mute)" }}>
                /{row.original.productSlug}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "variants",
        accessorFn: (group) => group.variants.length,
        header: "Variants",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium tabular-nums" style={{ color: "var(--admin-text)" }}>
              {row.original.variants.length}{" "}
              {row.original.variants.length === 1 ? "variant" : "variants"}
            </p>
            <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--admin-text-mute)" }}>
              {row.original.variants.map((variant) => variant.variantTitle).join(" · ")}
            </p>
          </div>
        ),
      },
      {
        id: "status",
        accessorFn: (group) =>
          group.outCount > 0 ? 2 : group.lowCount > 0 ? 1 : 0,
        header: "Status",
        cell: ({ row }) => <GroupStatus group={row.original} />,
      },
      {
        id: "onHand",
        accessorFn: (group) => group.onHand,
        header: "On hand",
        meta: { align: "right" },
        cell: ({ row }) => (
          <span className="font-medium tabular-nums" style={{ color: "var(--admin-text)" }}>
            {row.original.onHand}
          </span>
        ),
      },
      {
        id: "reserved",
        accessorFn: (group) => group.reserved,
        header: "Reserved",
        meta: { align: "right" },
        cell: ({ row }) => (
          <span className="tabular-nums" style={{ color: "var(--admin-text-soft)" }}>
            {row.original.reserved}
          </span>
        ),
      },
      {
        id: "available",
        accessorFn: (group) => group.available,
        header: "Available",
        meta: { align: "right" },
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums" style={{ color: "var(--admin-text)" }}>
            {row.original.available}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) => (
          <div className="ml-auto flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveId(row.original.productId)}
            >
              <Icon.Settings width={14} height={14} />
              Edit
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <DataTable<ProductGroup>
        columns={columns}
        data={groups}
        getRowId={(group) => group.productId}
        searchPlaceholder="Search products by title, slug, variant, or SKU…"
        pageSize={10}
        initialSorting={[{ id: "available", desc: false }]}
      />
      {activeGroup ? (
        <EditPanel
          key={activeGroup.productId}
          group={activeGroup}
          onClose={() => setActiveId(null)}
          onSaved={() => {
            /* server revalidate refreshes totals via new props */
          }}
        />
      ) : null}
    </>
  );
}
