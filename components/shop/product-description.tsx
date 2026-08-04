"use client";

import { useEffect, useRef, useState } from "react";

const COLLAPSED_MAX_HEIGHT = 260;

type ProductDescriptionProps = {
  html: string;
};

/**
 * Legacy listings carry very long descriptions. Left unclamped they push the
 * buy panel below the fold, so the body is capped until the reader opts in.
 */
export function ProductDescription({ html }: ProductDescriptionProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const node = bodyRef.current;
    if (!node) return;

    const measure = () => {
      setOverflows(node.scrollHeight > COLLAPSED_MAX_HEIGHT + 24);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [html]);

  const clamped = overflows && !expanded;

  return (
    <div className="mb-7">
      <div className="relative">
        <div
          ref={bodyRef}
          id="product-description-body"
          style={clamped ? { maxHeight: COLLAPSED_MAX_HEIGHT } : undefined}
          className={`prose prose-stone max-w-none font-serif text-[17px] leading-[1.65] text-ink-soft prose-p:my-3 prose-ul:my-3 ${
            clamped ? "overflow-hidden" : ""
          }`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {clamped ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-paper via-paper/85 to-transparent"
          />
        ) : null}
      </div>

      {overflows ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls="product-description-body"
          className="mt-2 inline-flex min-h-11 items-center gap-2 text-[12px] uppercase tracking-[0.18em] text-ink-soft transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2"
        >
          <span className="border-b border-ink-mute pb-0.5">
            {expanded ? "Show less" : "Read full description"}
          </span>
          <span
            aria-hidden="true"
            className={`transition-transform duration-200 ease-out ${
              expanded ? "-rotate-90" : "rotate-90"
            }`}
          >
            →
          </span>
        </button>
      ) : null}
    </div>
  );
}
