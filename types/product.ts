export type ProductStatus = "draft" | "active" | "archived";

export type Product = {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProductVariant = {
  id: string;
  productId: string;
  title: string;
  sku: string;
  price: number;
  compareAtPrice?: number | null;
};
