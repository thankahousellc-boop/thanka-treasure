import { notFound } from "next/navigation";

import { productRepository } from "@/lib/repositories/product-repository";

import { archiveProductAction, updateProductAction } from "../actions";
import { ProductForm } from "../product-form";
import { ProductImageManager } from "../product-image-manager";

type AdminEditProductPageProps = {
  params: Promise<{ id: string }>;
};

function toAdminStatus(value: string): "draft" | "active" | "archived" {
  if (value === "active" || value === "archived") {
    return value;
  }

  return "draft";
}

export default async function AdminEditProductPage({
  params,
}: AdminEditProductPageProps) {
  const { id } = await params;
  const record = await productRepository.findByIdForAdmin(id);

  if (!record) {
    notFound();
  }

  const updateAction = updateProductAction.bind(null, id);

  return (
    <div className="space-y-4">
      <ProductForm
        title={`Edit product: ${record.product.title}`}
        description="Update core product details, pricing, and inventory."
        submitLabel="Save changes"
        action={updateAction}
        values={{
          title: record.product.title,
          slug: record.product.slug,
          description: record.product.description ?? "",
          metaTitle: record.product.metaTitle ?? "",
          metaDescription: record.product.metaDescription ?? "",
          status: toAdminStatus(record.product.status),
          productType: record.product.productType ?? "",
          vendor: record.product.vendor ?? "",
          tags: record.product.tags.join(", "),
          variants:
            record.variants.length > 0
              ? record.variants.map((variant) => ({
                  id: variant.id,
                  title: variant.title,
                  sku: variant.sku ?? "",
                  option1: variant.option1 ?? "",
                  option2: variant.option2 ?? "",
                  option3: variant.option3 ?? "",
                  price: (variant.price / 100).toFixed(2),
                  compareAtPrice:
                    variant.compareAtPrice !== null &&
                    variant.compareAtPrice !== undefined
                      ? (variant.compareAtPrice / 100).toFixed(2)
                      : "",
                  inventoryQuantity:
                    variant.inventory?.quantity !== undefined
                      ? String(variant.inventory.quantity)
                      : "0",
                  lowStockThreshold:
                    variant.inventory?.lowStockThreshold !== undefined
                      ? String(variant.inventory.lowStockThreshold)
                      : "5",
                }))
              : [
                  {
                    title: "Default",
                    sku: "",
                    option1: "",
                    option2: "",
                    option3: "",
                    price: "",
                    compareAtPrice: "",
                    inventoryQuantity: "0",
                    lowStockThreshold: "5",
                  },
                ],
        }}
      />

      <ProductImageManager
        productId={record.product.id}
        variants={record.variants.map((variant) => ({
          id: variant.id,
          title: variant.title,
          sku: variant.sku,
        }))}
        images={record.images}
      />

      <form
        action={archiveProductAction}
        className="rounded border border-zinc-200 bg-white p-5"
      >
        <input type="hidden" name="id" value={record.product.id} />
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded border border-zinc-300 px-3 text-xs font-medium uppercase tracking-[0.06em] text-zinc-700 hover:bg-zinc-100"
        >
          Archive product
        </button>
      </form>
    </div>
  );
}
