"use client";

import Image from "next/image";
import { useState } from "react";

import { useSelectedFrame } from "@/components/shop/selected-frame-context";

export type GalleryImage = {
  src: string;
  alt: string;
};

type ProductGalleryProps = {
  images: GalleryImage[];
  badge?: string;
};

export function ProductGallery({ images, badge }: ProductGalleryProps) {
  const safeImages =
    images.length > 0 ? images : [{ src: "/next.svg", alt: "" }];
  const [activeIndex, setActiveIndex] = useState(0);
  const active = safeImages[activeIndex] ?? safeImages[0];
  const frameCtx = useSelectedFrame();
  const frame = frameCtx?.selectedFrame ?? null;
  const showFrame = Boolean(frame?.imageUrl);

  const hasThumbnails = safeImages.length > 1;

  return (
    <div
      className={`grid items-start gap-4 max-[600px]:grid-cols-1 ${
        hasThumbnails ? "grid-cols-[90px_1fr]" : "grid-cols-1"
      }`}
    >
      {hasThumbnails ? (
        <div className="flex flex-col gap-2.5 max-[600px]:order-2 max-[600px]:flex-row max-[600px]:overflow-x-auto">
          {safeImages.map((image, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={`${image.src}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`View image ${index + 1}`}
                aria-current={isActive ? "true" : undefined}
                className={`relative aspect-square w-[90px] flex-shrink-0 overflow-hidden rounded-sm bg-paper-2 transition-colors ${
                  isActive
                    ? "border border-ink outline-2 outline-ink outline-offset-2"
                    : "border border-(--line) hover:border-ink-mute"
                }`}
              >
                <Image
                  src={image.src}
                  alt=""
                  aria-hidden="true"
                  fill
                  sizes="90px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="relative aspect-4/5 overflow-hidden rounded-md bg-paper-3 shadow-(--shadow-1)">
        {badge ? (
          <span className="absolute top-4.5 left-4.5 z-10 rounded-full bg-ink px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-paper">
            {badge}
          </span>
        ) : null}
        {showFrame && frame ? (
          <>
            <div
              className="absolute overflow-hidden"
              style={{
                left: `${frame.cutoutX}%`,
                top: `${frame.cutoutY}%`,
                width: `${frame.cutoutWidth}%`,
                height: `${frame.cutoutHeight}%`,
              }}
            >
              <Image
                src={active.src}
                alt={active.alt}
                fill
                priority
                sizes="(max-width: 980px) 60vw, 36vw"
                className="object-cover transition-transform duration-700 ease-out hover:scale-[1.04]"
              />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={frame.imageUrl ?? ""}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            />
          </>
        ) : (
          <Image
            src={active.src}
            alt={active.alt}
            fill
            priority
            sizes="(max-width: 980px) 100vw, 60vw"
            className="object-cover transition-transform duration-700 ease-out hover:scale-[1.04]"
          />
        )}
        <span className="absolute right-3.5 bottom-3.5 z-10 hidden items-center gap-1.5 rounded-full bg-paper/90 px-3.5 py-2 text-[11px] uppercase tracking-[0.14em] text-ink-soft backdrop-blur-sm [@media(hover:hover)]:inline-flex">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5M11 8v6M8 11h6" />
          </svg>
          Hover to zoom
        </span>
      </div>
    </div>
  );
}
