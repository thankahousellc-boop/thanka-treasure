/**
 * Shared storefront button class strings.
 *
 * These were copy-pasted inline across every auth and shop form, which is how
 * they drifted out of sync. Keeping them here means a pending/disabled tweak
 * lands everywhere at once.
 *
 * `enabled:hover:` rather than plain `hover:` — a disabled button must not
 * light up under the cursor, otherwise it still reads as clickable.
 */

/** Solid maroon CTA: sign in, submit, pay. One per screen. */
export const shopPrimaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 border border-maroon-700 bg-maroon-700 px-6 text-sm font-medium uppercase tracking-[0.08em] text-white transition enabled:hover:bg-maroon-600";

/** Outlined maroon action: filter apply, secondary submit. */
export const shopSecondaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 border border-maroon-700 px-6 text-sm font-medium uppercase tracking-[0.08em] text-maroon-700 transition enabled:hover:bg-maroon-700 enabled:hover:text-white";

/** Pill CTA used by the editorial/atelier surfaces (product page, footer). */
export const inkPillButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-4 text-[13px] font-medium uppercase tracking-[0.16em] text-paper transition enabled:hover:bg-ink-soft";
