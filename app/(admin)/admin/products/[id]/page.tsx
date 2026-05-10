import { notFound } from "next/navigation";

import { Button, Card, CardBody, CardHeader } from "@/components/admin/ui";
import { frameRepository } from "@/lib/repositories/frame-repository";
import { productRepository } from "@/lib/repositories/product-repository";

import { archiveProductAction, updateProductAction } from "../actions";
import { ProductForm } from "../product-form";
import { ProductFramesPicker } from "../product-frames-picker";
import { ProductImageManager } from "../product-image-manager";
import { ProductSearchEngineCard } from "../product-search-engine-card";

const PRODUCT_FORM_ID = "product-edit-form";

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

  const [allFrames, productFrameRows] = await Promise.all([
    frameRepository.listAll().catch(() => []),
    frameRepository.listForProductAdmin(id).catch(() => []),
  ]);

  const availableFrames = allFrames
    .filter(
      (frame) =>
        frame.isActive ||
        productFrameRows.some((row) => row.id === frame.id),
    )
    .map((frame) => ({
      id: frame.id,
      name: frame.name,
      priceDelta: frame.priceDelta,
      imageBucket: frame.imageBucket,
      imagePath: frame.imagePath,
    }));

  const selectedFrameIds = productFrameRows.map((row) => row.id);
  const defaultFrameId =
    productFrameRows.find((row) => row.isDefault)?.id ?? null;

  return (
    <div className="space-y-5">
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <ProductImageManager
            productId={record.product.id}
            variants={record.variants.map((variant) => ({
              id: variant.id,
              title: variant.title,
              sku: variant.sku,
            }))}
            images={record.images}
          />

          <ProductFramesPicker
            availableFrames={availableFrames}
            initialSelectedIds={selectedFrameIds}
            initialDefaultId={defaultFrameId}
            formId={PRODUCT_FORM_ID}
          />

          <ProductSearchEngineCard
            metaTitle={record.product.metaTitle ?? ""}
            metaDescription={record.product.metaDescription ?? ""}
            formId={PRODUCT_FORM_ID}
          />
        </div>

        <div className="space-y-5">
          <ProductForm
            title={`Edit product: ${record.product.title}`}
            description="Update core product details, pricing, and inventory."
            submitLabel="Save changes"
            action={updateAction}
            formId={PRODUCT_FORM_ID}
            hideFramesPicker
            hideSearchEngineCard
            productId={record.product.id}
            availableFrames={availableFrames}
            selectedFrameIds={selectedFrameIds}
            defaultFrameId={defaultFrameId}
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
        </div>
      </div>

      <Card>
        <CardHeader
          title="Danger zone"
          description="Archive this product to hide it from the storefront. You can restore it later from the products list."
        />
        <CardBody>
          <form action={archiveProductAction}>
            <input type="hidden" name="id" value={record.product.id} />
            <Button type="submit" variant="danger" size="sm">
              Archive product
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
