/**
 * How long an inventory hold survives without a keepalive. The checkout page
 * refreshes the hold every KEEPALIVE_INTERVAL_MS, so an active shopper keeps
 * their stock indefinitely while an abandoned tab lapses within this window.
 *
 * Deliberately shorter than Stripe's 30-minute session expiry: the hold is ours
 * and expires on our clock, so correctness never depends on a webhook arriving.
 */
export const RESERVATION_TTL_MS = 5 * 60 * 1000;

/**
 * Keepalive cadence. Must stay well under RESERVATION_TTL_MS so a single
 * dropped request cannot expire a live hold.
 */
export const KEEPALIVE_INTERVAL_MS = 90 * 1000;

export const RESERVATION_STATUS = {
  OPEN: "open",
  RELEASED: "released",
  CONFIRMED: "confirmed",
} as const;

export type ReservationStatus =
  (typeof RESERVATION_STATUS)[keyof typeof RESERVATION_STATUS];
