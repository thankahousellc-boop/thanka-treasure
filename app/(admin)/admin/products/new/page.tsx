import { frameRepository } from "@/lib/repositories/frame-repository";

import { createProductAction } from "../actions";
import { ProductForm } from "../product-form";

export const dynamic = "force-dynamic";

export default async function AdminNewProductPage() {
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
    <ProductForm
      title="Create product"
      description="Create a product with a primary variant and inventory baseline."
      submitLabel="Create product"
      action={createProductAction}
      availableFrames={availableFrames}
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
  );
}
