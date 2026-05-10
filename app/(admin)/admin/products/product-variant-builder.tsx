"use client";

import { Fragment, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  Badge,
  Button,
  Field,
  Icon,
  Input,
} from "@/components/admin/ui";

export type ProductVariantFormValue = {
  id?: string;
  title: string;
  sku: string;
  option1: string;
  option2: string;
  option3: string;
  price: string;
  compareAtPrice: string;
  inventoryQuantity: string;
  lowStockThreshold: string;
};

type ProductVariantBuilderProps = {
  initialVariants: ProductVariantFormValue[];
};

function createBlankVariant(): ProductVariantFormValue {
  return {
    title: "",
    sku: "",
    option1: "",
    option2: "",
    option3: "",
    price: "",
    compareAtPrice: "",
    inventoryQuantity: "0",
    lowStockThreshold: "5",
  };
}

function isVariantBlank(variant: ProductVariantFormValue) {
  return (
    !variant.id &&
    !variant.title.trim() &&
    !variant.sku.trim() &&
    !variant.price.trim()
  );
}

export function ProductVariantBuilder({
  initialVariants,
}: ProductVariantBuilderProps) {
  const [variants, setVariants] = useState<ProductVariantFormValue[]>(
    initialVariants.length > 0 ? initialVariants : [createBlankVariant()],
  );
  const [draft, setDraft] = useState<{
    index: number | null;
    variant: ProductVariantFormValue;
  } | null>(null);

  function startAdd() {
    setDraft({ index: null, variant: createBlankVariant() });
  }

  function startEdit(index: number) {
    setDraft({ index, variant: variants[index] });
  }

  function saveDraft(updated: ProductVariantFormValue) {
    if (!draft) return;
    if (draft.index === null) {
      setVariants((current) => [...current, updated]);
    } else {
      const targetIndex = draft.index;
      setVariants((current) =>
        current.map((variant, index) =>
          index === targetIndex ? updated : variant,
        ),
      );
    }
    setDraft(null);
  }

  function removeVariant(index: number) {
    setVariants((current) => {
      if (current.length <= 1) return current;
      return current.filter((_, variantIndex) => variantIndex !== index);
    });
  }

  return (
    <div className="space-y-3">
      {variants.map((variant, index) => (
        <Fragment key={variant.id ?? `new-${index}`}>
          <input type="hidden" name="variantId" value={variant.id ?? ""} />
          <input type="hidden" name="variantTitle" value={variant.title} />
          <input type="hidden" name="sku" value={variant.sku} />
          <input type="hidden" name="option1" value={variant.option1} />
          <input type="hidden" name="option2" value={variant.option2} />
          <input type="hidden" name="option3" value={variant.option3} />
          <input type="hidden" name="price" value={variant.price} />
          <input
            type="hidden"
            name="compareAtPrice"
            value={variant.compareAtPrice}
          />
          <input
            type="hidden"
            name="inventoryQuantity"
            value={variant.inventoryQuantity}
          />
          <input
            type="hidden"
            name="lowStockThreshold"
            value={variant.lowStockThreshold}
          />
        </Fragment>
      ))}

      <ul className="space-y-2">
        {variants.map((variant, index) => (
          <li key={variant.id ?? `row-${index}`}>
            <VariantRow
              variant={variant}
              isOnly={variants.length <= 1}
              onEdit={() => startEdit(index)}
              onRemove={() => removeVariant(index)}
            />
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={startAdd}
        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md text-sm font-medium transition hover:brightness-110"
        style={{
          background: "var(--admin-surface-2)",
          color: "var(--admin-text-soft)",
          border: "1px dashed var(--admin-border-strong)",
        }}
      >
        <Icon.Plus width={14} height={14} />
        <span>Add variant</span>
      </button>

      {draft ? (
        <VariantModal
          initial={draft.variant}
          isNew={draft.index === null}
          onSave={saveDraft}
          onClose={() => setDraft(null)}
        />
      ) : null}
    </div>
  );
}

type VariantRowProps = {
  variant: ProductVariantFormValue;
  isOnly: boolean;
  onEdit: () => void;
  onRemove: () => void;
};

function VariantRow({ variant, isOnly, onEdit, onRemove }: VariantRowProps) {
  const blank = isVariantBlank(variant);
  const optionParts = [variant.option1, variant.option2, variant.option3]
    .map((value) => value.trim())
    .filter(Boolean);
  const priceLabel = variant.price.trim() ? `$${variant.price}` : "—";

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-2.5"
      style={{
        background: "var(--admin-surface)",
        border: "1px solid var(--admin-border-strong)",
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className="truncate text-sm font-medium"
            style={{ color: blank ? "var(--admin-text-mute)" : "var(--admin-text)" }}
          >
            {variant.title || "Untitled variant"}
          </p>
          {variant.id ? <Badge tone="muted">existing</Badge> : (
            <Badge tone="info">new</Badge>
          )}
          {blank ? <Badge tone="warning">incomplete</Badge> : null}
        </div>
        <p
          className="mt-0.5 truncate text-xs"
          style={{ color: "var(--admin-text-mute)" }}
        >
          {variant.sku ? `${variant.sku} · ` : ""}
          {optionParts.length > 0 ? optionParts.join(" / ") + " · " : ""}
          {priceLabel} · {variant.inventoryQuantity || "0"} in stock
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium transition hover:brightness-110"
          style={{
            background: "var(--admin-surface-2)",
            color: "var(--admin-text)",
            border: "1px solid var(--admin-border-strong)",
          }}
        >
          Edit
        </button>
        {!variant.id && !isOnly ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md transition"
            style={{ color: "#b3261e" }}
            aria-label={`Remove ${variant.title || "variant"}`}
            title="Remove"
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor =
                "rgba(179, 38, 30, 0.08)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Icon.Close width={14} height={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

type VariantModalProps = {
  initial: ProductVariantFormValue;
  isNew: boolean;
  onSave: (variant: ProductVariantFormValue) => void;
  onClose: () => void;
};

function VariantModal({ initial, isNew, onSave, onClose }: VariantModalProps) {
  const [draft, setDraft] = useState<ProductVariantFormValue>(initial);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  function update(key: keyof ProductVariantFormValue, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(draft);
  }

  const target =
    (document.querySelector(".admin-app") as HTMLElement | null) ??
    document.body;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(43, 19, 24, 0.45)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "5vh 16px",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-xl"
        style={{
          background: "var(--admin-surface)",
          border: "1px solid var(--admin-border-strong)",
          boxShadow: "var(--admin-shadow-lg)",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          className="flex items-start justify-between gap-4 px-5 py-4"
          style={{ borderBottom: "1px solid var(--admin-border)" }}
        >
          <div>
            <h3
              className="text-base font-semibold"
              style={{ color: "var(--admin-text)" }}
            >
              {isNew ? "Add variant" : "Edit variant"}
            </h3>
            <p className="mt-0.5 text-xs" style={{ color: "var(--admin-text-mute)" }}>
              Configure SKU, options, pricing, and inventory.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md transition"
            style={{ color: "var(--admin-text-soft)" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor =
                "var(--admin-accent-soft)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Icon.Close />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="grid gap-4 overflow-y-auto px-5 py-5 md:grid-cols-2">
            <Field label="Variant title" className="md:col-span-2">
              <Input
                required
                value={draft.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="Default · Small · Black"
                autoFocus
              />
            </Field>

            <Field label="SKU">
              <Input
                value={draft.sku}
                onChange={(event) => update("sku", event.target.value)}
                placeholder="TT-001"
              />
            </Field>

            <Field label="Option 1 (size)">
              <Input
                value={draft.option1}
                onChange={(event) => update("option1", event.target.value)}
              />
            </Field>

            <Field label="Option 2 (color)">
              <Input
                value={draft.option2}
                onChange={(event) => update("option2", event.target.value)}
              />
            </Field>

            <Field label="Option 3">
              <Input
                value={draft.option3}
                onChange={(event) => update("option3", event.target.value)}
              />
            </Field>

            <Field label="Price (USD)">
              <Input
                type="number"
                min="0"
                step="0.01"
                required
                value={draft.price}
                onChange={(event) => update("price", event.target.value)}
              />
            </Field>

            <Field label="Compare-at price">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={draft.compareAtPrice}
                onChange={(event) =>
                  update("compareAtPrice", event.target.value)
                }
              />
            </Field>

            <Field label="Inventory">
              <Input
                type="number"
                min="0"
                step="1"
                value={draft.inventoryQuantity}
                onChange={(event) =>
                  update("inventoryQuantity", event.target.value)
                }
              />
            </Field>

            <Field label="Low-stock threshold">
              <Input
                type="number"
                min="0"
                step="1"
                value={draft.lowStockThreshold}
                onChange={(event) =>
                  update("lowStockThreshold", event.target.value)
                }
              />
            </Field>
          </div>

          <div
            className="flex items-center justify-end gap-2 px-5 py-3"
            style={{
              background: "var(--admin-surface-2)",
              borderTop: "1px solid var(--admin-border)",
            }}
          >
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {isNew ? "Add variant" : "Save variant"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    target,
  );
}
