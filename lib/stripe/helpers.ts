type StripeLineItemInput = {
  productId: string;
  variantId: string;
  productTitle: string;
  variantTitle: string | null;
  sku: string | null;
  unitAmount: number;
  quantity: number;
  image?: string | null;
};

export function toStripeLineItems(
  items: StripeLineItemInput[],
  currency: string,
) {
  return items.map((item) => {
    const metadata: Record<string, string> = {
      productId: item.productId,
      variantId: item.variantId,
    };

    if (item.variantTitle) {
      metadata.variantTitle = item.variantTitle;
    }

    if (item.sku) {
      metadata.sku = item.sku;
    }

    return {
      quantity: item.quantity,
      price_data: {
        currency: currency.toLowerCase(),
        product_data: {
          name: item.variantTitle
            ? `${item.productTitle} - ${item.variantTitle}`
            : item.productTitle,
          images: item.image ? [item.image] : undefined,
          metadata,
        },
        unit_amount: item.unitAmount,
      },
    };
  });
}
