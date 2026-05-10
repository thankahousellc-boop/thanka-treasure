type StripeLineItemInput = {
  productId: string;
  variantId: string;
  productTitle: string;
  variantTitle: string | null;
  sku: string | null;
  unitAmount: number;
  quantity: number;
  image?: string | null;
  frame?: {
    id: string;
    name: string;
    imageUrl?: string | null;
    priceDelta: number;
  } | null;
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

    if (item.frame) {
      metadata.frameId = item.frame.id;
      metadata.frameName = item.frame.name.slice(0, 200);
      metadata.framePriceDelta = String(item.frame.priceDelta);
      if (item.frame.imageUrl) {
        metadata.frameImageUrl = item.frame.imageUrl.slice(0, 480);
      }
    }

    return {
      quantity: item.quantity,
      price_data: {
        currency: currency.toLowerCase(),
        product_data: {
          name: item.frame
            ? item.variantTitle
              ? `${item.productTitle} - ${item.variantTitle} (${item.frame.name})`
              : `${item.productTitle} (${item.frame.name})`
            : item.variantTitle
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
