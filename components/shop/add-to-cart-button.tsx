"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";

import { BASE_CURRENCY } from "@/lib/currency/config";
import { convertFromUsd, type ExchangeRateMap } from "@/lib/currency/convert";
import { useCartStore } from "@/lib/store/cart";
import { formatCurrency } from "@/lib/utils/formatters";

type VariantOption = {
  id: string;
  title: string;
  price: number;
};

type AddToCartButtonProps = {
  productId: string;
  slug: string;
  title: string;
  imageUrl?: string;
  cartCurrency?: string;
  displayCurrency?: string;
  exchangeRates?: ExchangeRateMap;
  variants: VariantOption[];
};

export function AddToCartButton({
  productId,
  slug,
  title,
  imageUrl,
  cartCurrency = BASE_CURRENCY,
  displayCurrency = BASE_CURRENCY,
  exchangeRates = {},
  variants,
}: AddToCartButtonProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const clear = useCartStore((state) => state.clear);
  const [selectedVariantId, setSelectedVariantId] = useState(
    variants[0]?.id ?? "",
  );
  const [quantity, setQuantity] = useState(1);
  const [statusMessage, setStatusMessage] = useState("");
  const fieldId = useId();
  const variantFieldId = `${fieldId}-variant`;
  const quantityFieldId = `${fieldId}-quantity`;
  const statusMessageId = `${fieldId}-add-to-cart-status`;

  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [selectedVariantId, variants],
  );

  const toCartCurrencyAmount = (priceInUsdCents: number) =>
    cartCurrency === BASE_CURRENCY
      ? priceInUsdCents
      : convertFromUsd(priceInUsdCents, cartCurrency, exchangeRates);

  const formatVariantPrice = (priceInUsdCents: number) => {
    const convertedPrice =
      displayCurrency === BASE_CURRENCY
        ? priceInUsdCents
        : convertFromUsd(priceInUsdCents, displayCurrency, exchangeRates);

    return formatCurrency(convertedPrice, displayCurrency);
  };

  const announceStatus = (message: string) => {
    setStatusMessage("");
    window.setTimeout(() => {
      setStatusMessage(message);
      window.setTimeout(() => setStatusMessage(""), 1500);
    }, 0);
  };

  if (variants.length === 0) {
    return (
      <p className="mt-6 rounded border border-border-light bg-maroon-50 p-3 text-sm text-maroon-800">
        This product currently has no purchasable variants.
      </p>
    );
  }

  const handleAdd = () => {
    if (!selectedVariant) {
      return;
    }

    addItem({
      productId,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      slug,
      title,
      quantity,
      unitPrice: toCartCurrencyAmount(selectedVariant.price),
      currency: cartCurrency,
      imageUrl,
    });

    announceStatus(`${title} added to cart.`);
  };

  const handleBuyNow = () => {
    if (!selectedVariant) {
      return;
    }

    clear();
    addItem({
      productId,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      slug,
      title,
      quantity,
      unitPrice: toCartCurrencyAmount(selectedVariant.price),
      currency: cartCurrency,
      imageUrl,
    });

    router.push("/checkout");
  };

  return (
    <div className="mt-6 space-y-4 border-t border-border-light pt-5">
      <div className="space-y-2">
        <label
          htmlFor={variantFieldId}
          className="text-xs uppercase tracking-[0.08em] text-warm-gray-500"
        >
          Select variant
        </label>
        <select
          id={variantFieldId}
          value={selectedVariantId}
          onChange={(event) => setSelectedVariantId(event.target.value)}
          className="h-10 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-800"
        >
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.title} - {formatVariantPrice(variant.price)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label
          htmlFor={quantityFieldId}
          className="text-xs uppercase tracking-[0.08em] text-warm-gray-500"
        >
          Quantity
        </label>
        <input
          id={quantityFieldId}
          type="number"
          min={1}
          value={quantity}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            setQuantity(
              Number.isNaN(nextValue) || nextValue < 1 ? 1 : nextValue,
            );
          }}
          className="h-10 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-800"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleAdd}
          aria-describedby={statusMessageId}
          className="inline-flex h-11 w-full items-center justify-center border border-maroon-700 bg-maroon-700 px-6 text-sm font-medium uppercase tracking-[0.08em] text-white hover:bg-maroon-600"
        >
          Add to cart
        </button>

        <button
          type="button"
          onClick={handleBuyNow}
          className="inline-flex h-11 w-full items-center justify-center border border-maroon-700 px-6 text-sm font-medium uppercase tracking-[0.08em] text-maroon-700 hover:bg-maroon-50"
        >
          Buy now
        </button>
      </div>

      <p className="text-xs text-warm-gray-600">
        Prices are validated again at checkout.
      </p>

      <p
        id={statusMessageId}
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {statusMessage}
      </p>

      <Link
        href="/cart"
        className="inline-flex text-sm font-medium text-maroon-700 hover:text-maroon-600"
      >
        View cart
      </Link>
    </div>
  );
}
