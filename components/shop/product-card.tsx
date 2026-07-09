"use client";

import Image from "next/image";
import Link from "next/link";

import { Price } from "@/components/shop/price";

export type ProductCardData = {
  slug: string;
  title: string;
  // Amount in USD cents; null renders the "Price on request" fallback.
  priceCents: number | null;
  primaryImage: string;
  secondaryImage?: string;
  badge?: string;
  caption?: string;
};

export function ProductCard({
  slug,
  title,
  priceCents,
  primaryImage,
  secondaryImage,
  badge,
  caption = "Hand-painted",
}: ProductCardData) {
  return (
    <Link
      href={`/products/${slug}`}
      className="group flex flex-col gap-3.5 outline-none"
    >
      <div className="relative aspect-4/5 overflow-hidden rounded-sm bg-paper-3 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:-translate-y-1 group-hover:shadow-(--shadow-2) group-focus-visible:-translate-y-1 group-focus-visible:shadow-(--shadow-2)">
        {badge ? (
          <span className="absolute top-3.5 left-3.5 z-10 rounded-full bg-paper/95 px-2.5 py-1.5 text-[10.5px] uppercase tracking-[0.16em] text-ink-soft backdrop-blur-sm">
            {badge}
          </span>
        ) : null}

        <button
          type="button"
          aria-label="Save to favorites"
          onClick={(event) => event.preventDefault()}
          className="absolute top-3 right-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-paper/95 text-ink-soft opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:text-ink group-focus-visible:opacity-100"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10Z" />
          </svg>
        </button>

        <Image
          src={primaryImage}
          alt={title}
          fill
          sizes="(max-width: 560px) 100vw, (max-width: 1100px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        {secondaryImage && secondaryImage !== primaryImage ? (
          <Image
            src={secondaryImage}
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 560px) 100vw, (max-width: 1100px) 50vw, 33vw"
            className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
          />
        ) : null}

        <div className="absolute right-3.5 bottom-3.5 left-3.5 flex items-center justify-center gap-2 rounded-full bg-ink px-3.5 py-2.5 text-[12px] uppercase tracking-[0.14em] text-paper opacity-0 transition-[opacity,transform] duration-300 ease-out translate-y-2 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          View piece <span className="opacity-70">→</span>
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-[22px] leading-tight font-medium text-ink">
          {title}
        </h3>
        <Price cents={priceCents} className="shrink-0 text-sm text-ink-soft" />
      </div>
      {caption ? (
        <p className="text-[11.5px] uppercase tracking-[0.06em] text-ink-mute">
          {caption}
        </p>
      ) : null}
    </Link>
  );
}
