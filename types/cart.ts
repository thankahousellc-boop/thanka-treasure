export type CartItem = {
  productId: string;
  variantId: string;
  variantTitle?: string;
  slug: string;
  title: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  imageUrl?: string;
};
