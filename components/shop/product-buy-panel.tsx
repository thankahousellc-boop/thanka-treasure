"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";

import { BASE_CURRENCY } from "@/lib/currency/config";
import { convertFromUsd, type ExchangeRateMap } from "@/lib/currency/convert";
import {
  useSelectedFrame,
  type FrameOption,
} from "@/components/shop/selected-frame-context";
import { useCartStore } from "@/lib/store/cart";
import { formatCurrency } from "@/lib/utils/formatters";

function variantHasNoBrocade(title: string): boolean {
  const t = title.toLowerCase();
  return t.includes("no brocade") || t.includes("without brocade");
}

type VariantOption = {
  id: string;
  title: string;
  price: number;
};

export type { FrameOption };

type ProductBuyPanelProps = {
  productId: string;
  slug: string;
  title: string;
  imageUrl?: string;
  cartCurrency?: string;
  displayCurrency?: string;
  exchangeRates?: ExchangeRateMap;
  variants: VariantOption[];
  frames?: FrameOption[];
};

export function ProductBuyPanel({
  productId,
  slug,
  title,
  imageUrl,
  cartCurrency = BASE_CURRENCY,
  displayCurrency = BASE_CURRENCY,
  exchangeRates = {},
  variants,
  frames = [],
}: ProductBuyPanelProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const clear = useCartStore((state) => state.clear);
  const [selectedVariantId, setSelectedVariantId] = useState(
    variants[0]?.id ?? "",
  );
  const frameCtx = useSelectedFrame();
  const fallbackInitialFrameId =
    frames.find((frame) => frame.isDefault)?.id ?? frames[0]?.id ?? "";
  const [localFrameId, setLocalFrameId] = useState(fallbackInitialFrameId);
  const selectedFrameId = frameCtx?.selectedFrameId ?? localFrameId;
  const setSelectedFrameId = frameCtx?.setSelectedFrameId ?? setLocalFrameId;
  const [statusMessage, setStatusMessage] = useState("");
  const fieldId = useId();
  const statusMessageId = `${fieldId}-status`;

  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [selectedVariantId, variants],
  );

  const noBrocade = selectedVariant
    ? variantHasNoBrocade(selectedVariant.title)
    : false;
  const showFrames = frames.length > 0 && !noBrocade;

  useEffect(() => {
    if (noBrocade) {
      if (selectedFrameId !== "") setSelectedFrameId("");
    } else if (frames.length > 0 && selectedFrameId === "") {
      setSelectedFrameId(fallbackInitialFrameId);
    }
  }, [
    noBrocade,
    frames.length,
    selectedFrameId,
    setSelectedFrameId,
    fallbackInitialFrameId,
  ]);

  const selectedFrame = useMemo(
    () =>
      showFrames
        ? frames.find((frame) => frame.id === selectedFrameId) ?? null
        : null,
    [selectedFrameId, frames, showFrames],
  );

  const formatVariantPrice = (priceUsdCents: number) => {
    const converted =
      displayCurrency === BASE_CURRENCY
        ? priceUsdCents
        : convertFromUsd(priceUsdCents, displayCurrency, exchangeRates);
    return formatCurrency(converted, displayCurrency);
  };

  const toCartCurrencyAmount = (priceUsdCents: number) =>
    cartCurrency === BASE_CURRENCY
      ? priceUsdCents
      : convertFromUsd(priceUsdCents, cartCurrency, exchangeRates);

  const announce = (message: string) => {
    setStatusMessage("");
    window.setTimeout(() => {
      setStatusMessage(message);
      window.setTimeout(() => setStatusMessage(""), 1500);
    }, 0);
  };

  const buildCartItem = () => {
    if (!selectedVariant) return null;
    const baseUsd = selectedVariant.price + (selectedFrame?.priceDelta ?? 0);
    return {
      productId,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      slug,
      title,
      quantity: 1,
      unitPrice: toCartCurrencyAmount(baseUsd),
      currency: cartCurrency,
      imageUrl,
      frame: selectedFrame
        ? {
            id: selectedFrame.id,
            name: selectedFrame.name,
            imageUrl: selectedFrame.imageUrl ?? undefined,
            priceDelta: toCartCurrencyAmount(selectedFrame.priceDelta),
          }
        : undefined,
    };
  };

  const handleAdd = () => {
    const item = buildCartItem();
    if (!item) return;
    addItem(item);
    announce(`${title} added to cart.`);
  };

  const handleBuyNow = () => {
    const item = buildCartItem();
    if (!item) return;
    clear();
    addItem(item);
    router.push("/checkout");
  };

  const totalUsdCents = selectedVariant
    ? selectedVariant.price + (selectedFrame?.priceDelta ?? 0)
    : 0;

  if (variants.length === 0) {
    return (
      <p className="mt-6 rounded-md border border-(--line) bg-paper-2 p-4 text-sm text-ink-soft">
        This piece is not currently available for purchase.
      </p>
    );
  }

  return (
    <>
      {variants.length > 1 ? (
        <div className="mb-6">
          <div className="mb-2.5 flex items-center justify-between text-[11.5px] tracking-[0.18em] text-ink uppercase">
            <span>Size</span>
            {selectedVariant ? (
              <span className="text-[12.5px] tracking-normal normal-case text-ink-mute">
                Currently{" "}
                <b className="font-medium text-ink">{selectedVariant.title}</b>
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-2.5 max-sm:grid-cols-2">
            {variants.map((variant) => {
              const isActive = variant.id === selectedVariantId;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={`rounded-md border px-3 py-3.5 text-left text-[13px] leading-tight transition ${
                    isActive
                      ? "border-ink bg-paper-2 text-ink shadow-[inset_0_0_0_1px_var(--color-ink)]"
                      : "border-(--line) bg-paper text-ink-soft hover:border-ink-mute"
                  }`}
                >
                  <span className="block text-[13.5px] font-medium text-ink hyphens-auto wrap-break-word">
                    {variant.title}
                  </span>
                  <span className="block text-xs text-ink-mute">
                    {formatVariantPrice(variant.price)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {showFrames ? (
        <div className="mb-6">
          <div className="mb-2.5 flex items-center justify-between text-[11.5px] tracking-[0.18em] text-ink uppercase">
            <span>Frame</span>
            {selectedFrame ? (
              <span className="text-[12.5px] tracking-normal normal-case text-ink-mute">
                {selectedFrame.priceDelta > 0
                  ? `+ ${formatVariantPrice(selectedFrame.priceDelta)}`
                  : "Included"}
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-2.5 max-sm:grid-cols-2">
            {frames.map((frame) => {
              const isActive = frame.id === selectedFrameId;
              return (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() => setSelectedFrameId(frame.id)}
                  aria-pressed={isActive}
                  className={`flex flex-col items-stretch gap-2 rounded-md border p-2 text-left transition ${
                    isActive
                      ? "border-ink bg-paper-2 shadow-[inset_0_0_0_1px_var(--color-ink)]"
                      : "border-(--line) bg-paper hover:border-ink-mute"
                  }`}
                >
                  <span className="block aspect-square w-full overflow-hidden rounded bg-paper-2">
                    {frame.imageUrl ? (
                      // Plain img keeps this client component lean and avoids next/image config for storage URLs.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={frame.imageUrl}
                        alt={frame.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-[10px] uppercase tracking-widest text-ink-mute">
                        No image
                      </span>
                    )}
                  </span>
                  <span className="block text-[12.5px] font-medium text-ink">
                    {frame.name}
                  </span>
                  <span className="block text-[11px] text-ink-mute">
                    {frame.priceDelta > 0
                      ? `+ ${formatVariantPrice(frame.priceDelta)}`
                      : "Included"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-7 flex gap-2.5">
        <button
          type="button"
          onClick={handleAdd}
          aria-describedby={statusMessageId}
          className="flex flex-1 items-center justify-center gap-2.5 rounded-full bg-ink px-6 py-4 text-[13px] font-medium uppercase tracking-[0.16em] text-paper transition hover:-translate-y-0.5 hover:bg-ink-soft hover:shadow-(--shadow-1)"
        >
          Add to cart
          {selectedVariant ? (
            <>
              <span className="opacity-60">·</span>
              {formatVariantPrice(totalUsdCents)}
            </>
          ) : null}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          aria-label="Buy now"
          className="grid h-14 w-14 place-items-center rounded-full border border-(--line) bg-paper text-ink-soft transition hover:border-ink hover:text-ink"
          title="Buy now"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10Z" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Share"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.share) {
              navigator.share({ title, url: window.location.href }).catch(() => undefined);
            } else if (typeof navigator !== "undefined" && navigator.clipboard) {
              navigator.clipboard.writeText(window.location.href).catch(() => undefined);
              announce("Link copied to clipboard.");
            }
          }}
          className="grid h-14 w-14 place-items-center rounded-full border border-(--line) bg-paper text-ink-soft transition hover:border-ink hover:text-ink"
          title="Share"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <path d="m16 6-4-4-4 4" />
            <path d="M12 2v13" />
          </svg>
        </button>
      </div>

      <p
        id={statusMessageId}
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {statusMessage}
      </p>
    </>
  );
}
