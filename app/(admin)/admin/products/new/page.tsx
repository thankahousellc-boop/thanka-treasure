import { DirtyFormProvider } from "@/components/admin/ui";
import { attributeRepository } from "@/lib/repositories/attribute-repository";
import { collectionRepository } from "@/lib/repositories/collection-repository";
import { frameRepository } from "@/lib/repositories/frame-repository";

import { createProductAction } from "../actions";
import { ProductForm } from "../product-form";

export const dynamic = "force-dynamic";

const PRODUCT_NEW_FORM_ID = "product-new-form";

export default async function AdminNewProductPage() {
  const attributeDefinitions = await attributeRepository
    .listDefinitions()
    .catch(() => []);
  const categories = await collectionRepository
    .listCategoriesForAdmin()
    .catch(() => []);
  const frames = await frameRepository.listAll().catch(() => []);
  const availableFrames = frames
    .filter((frame) => frame.isActive)
    .map((frame) => ({
      id: frame.id,
      name: frame.name,
      priceDelta: frame.priceDelta,
      imageBucket: frame.imageBucket,
      imagePath: frame.imagePath,
    }));

  return (
    <DirtyFormProvider formId={PRODUCT_NEW_FORM_ID}>
      <ProductForm
        title="Create product"
        description="Create a product with a primary variant and inventory baseline."
        submitLabel="Create product"
        action={createProductAction}
        formId={PRODUCT_NEW_FORM_ID}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
        availableFrames={availableFrames}
        attributeDefinitions={attributeDefinitions}
      selectedFrameIds={[]}
      defaultFrameId={null}
      values={{
        title: "",
        slug: "",
        description: "",
        metaTitle: "",
        metaDescription: "",
        status: "draft",
        productType: "",
        categoryId: "",
        vendor: "",
        tags: "",
        variants: [
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
    </DirtyFormProvider>
  );
}
