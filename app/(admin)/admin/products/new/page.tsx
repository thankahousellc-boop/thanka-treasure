import { createProductAction } from "../actions";
import { ProductForm } from "../product-form";

export default function AdminNewProductPage() {
  return (
    <ProductForm
      title="Create product"
      description="Create a product with a primary variant and inventory baseline."
      submitLabel="Create product"
      action={createProductAction}
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
