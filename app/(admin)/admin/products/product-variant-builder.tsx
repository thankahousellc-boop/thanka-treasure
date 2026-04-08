"use client";

import { useState } from "react";

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

export function ProductVariantBuilder({
  initialVariants,
}: ProductVariantBuilderProps) {
  const [variants, setVariants] = useState<ProductVariantFormValue[]>(
    initialVariants.length > 0 ? initialVariants : [createBlankVariant()],
  );

  function updateVariant(
    index: number,
    key: keyof ProductVariantFormValue,
    value: string,
  ) {
    setVariants((current) =>
      current.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [key]: value } : variant,
      ),
    );
  }

  function addVariant() {
    setVariants((current) => [...current, createBlankVariant()]);
  }

  function removeVariant(index: number) {
    setVariants((current) => {
      if (current.length <= 1) {
        return current;
      }

      return current.filter((_, variantIndex) => variantIndex !== index);
    });
  }

  return (
    <div className="space-y-4 rounded border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-zinc-800">
          Product variants (size/color/SKU)
        </p>
        <button
          type="button"
          onClick={addVariant}
          className="inline-flex h-9 items-center rounded border border-zinc-300 bg-white px-3 text-xs font-medium uppercase tracking-[0.06em] text-zinc-700 hover:bg-zinc-100"
        >
          Add variant
        </button>
      </div>

      <div className="space-y-3">
        {variants.map((variant, index) => {
          const canRemove = !variant.id;

          return (
            <div
              key={`${variant.id ?? "new"}-${index}`}
              className="space-y-3 rounded border border-zinc-200 bg-white p-3"
            >
              <input type="hidden" name="variantId" value={variant.id ?? ""} />

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.06em] text-zinc-600">
                    Variant title
                  </span>
                  <input
                    name="variantTitle"
                    required
                    value={variant.title}
                    onChange={(event) =>
                      updateVariant(index, "title", event.target.value)
                    }
                    className="h-9 w-full rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.06em] text-zinc-600">
                    SKU
                  </span>
                  <input
                    name="sku"
                    value={variant.sku}
                    onChange={(event) =>
                      updateVariant(index, "sku", event.target.value)
                    }
                    className="h-9 w-full rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.06em] text-zinc-600">
                    Option 1 (size)
                  </span>
                  <input
                    name="option1"
                    value={variant.option1}
                    onChange={(event) =>
                      updateVariant(index, "option1", event.target.value)
                    }
                    className="h-9 w-full rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.06em] text-zinc-600">
                    Option 2 (color)
                  </span>
                  <input
                    name="option2"
                    value={variant.option2}
                    onChange={(event) =>
                      updateVariant(index, "option2", event.target.value)
                    }
                    className="h-9 w-full rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.06em] text-zinc-600">
                    Option 3
                  </span>
                  <input
                    name="option3"
                    value={variant.option3}
                    onChange={(event) =>
                      updateVariant(index, "option3", event.target.value)
                    }
                    className="h-9 w-full rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.06em] text-zinc-600">
                    Price (USD)
                  </span>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={variant.price}
                    onChange={(event) =>
                      updateVariant(index, "price", event.target.value)
                    }
                    className="h-9 w-full rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.06em] text-zinc-600">
                    Compare-at
                  </span>
                  <input
                    name="compareAtPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={variant.compareAtPrice}
                    onChange={(event) =>
                      updateVariant(index, "compareAtPrice", event.target.value)
                    }
                    className="h-9 w-full rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.06em] text-zinc-600">
                    Inventory
                  </span>
                  <input
                    name="inventoryQuantity"
                    type="number"
                    min="0"
                    step="1"
                    value={variant.inventoryQuantity}
                    onChange={(event) =>
                      updateVariant(
                        index,
                        "inventoryQuantity",
                        event.target.value,
                      )
                    }
                    className="h-9 w-full rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.06em] text-zinc-600">
                    Low-stock threshold
                  </span>
                  <input
                    name="lowStockThreshold"
                    type="number"
                    min="0"
                    step="1"
                    value={variant.lowStockThreshold}
                    onChange={(event) =>
                      updateVariant(
                        index,
                        "lowStockThreshold",
                        event.target.value,
                      )
                    }
                    className="h-9 w-full rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">
                  {variant.id
                    ? "Existing variants can be edited here."
                    : "New variant will be created when you save."}
                </p>
                {canRemove ? (
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="inline-flex h-8 items-center rounded border border-zinc-300 px-3 text-xs font-medium uppercase tracking-[0.06em] text-zinc-700 hover:bg-zinc-100"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
