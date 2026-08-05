# Expiring Inventory Reservations

Date: 2026-08-04
Status: Approved for planning

## Problem

`inventory.reserved_quantity` is a mutable counter. `checkout-session-repository.ts` increments it
when a Stripe Checkout session is created and decrements it on release. Releasing requires an
action, and every release path can fail to fire:

| Path | Failure |
| --- | --- |
| Client re-POSTs `/api/checkout` with `existingSessionId` | `existingSessionId` lives in `localStorage`. Private mode, cleared storage, or a different device loses it, so the next request stacks a second reservation on top of the first. |
| Cart emptied on the checkout page | `checkout-embedded.tsx` returns early when `items.length === 0`, so no request is sent and nothing is released. |
| Tab closed or customer navigates away | Nothing calls release at all. |
| `checkout.session.expired` webhook | The only automatic path. If the endpoint is not subscribed, or delivery fails, the reservation is never released. |

Nothing sweeps expired `pending_checkout_sessions` rows, and no read of
`reserved_quantity` checks `expires_at`. A missed release is permanent: reserved climbs
monotonically, available stock falls to zero, and in-stock items show as unavailable.

Root cause: correctness depends on an action firing. Tabs close and webhooks fail, so the action
will eventually be missed.

## Approach

Reserved stock becomes a derived value with an expiry, not a stored counter.

A reservation is a row with an `expires_at`. Reserved is the sum of rows that are still open and
not yet expired. An abandoned reservation stops counting the moment its clock runs out — no code
runs, nothing is subtracted, nothing can be missed.

Release signals (webhook, page-leave beacon) still exist, but only to return stock **early**. If
they fail, stock returns when the clock expires. They become a latency optimisation rather than a
correctness requirement.

### Reservation lifetime: 5 minutes, sliding

A fixed 5-minute hold would break real customers: a shopper who spends seven minutes on the
address form loses their hold, then pays anyway, and the deduction at
`webhooks/stripe/route.ts:219` finds no live reservation.

Instead the hold is 5 minutes from the last keepalive. The checkout page sends a keepalive every
90 seconds, pushing `expires_at` to `now() + 5 minutes`. An active customer never loses their hold.
A closed tab stops sending, and the hold dies within 5 minutes.

Stripe enforces a minimum session `expires_at` of 30 minutes. Our reservation row is independent of
that and is unaffected.

## Data model

### New table: `checkout_reservations`

One row per held variant, replacing the `reserved_items` jsonb blob on
`pending_checkout_sessions`.

```
id                       uuid pk
stripe_session_id        text not null
variant_id               uuid not null references product_variants(id) on delete cascade
quantity                 integer not null
status                   text not null default 'open'   -- open | released | confirmed
expires_at               timestamptz not null
created_at               timestamptz not null default now()
updated_at               timestamptz not null default now()

index (variant_id, status, expires_at)   -- serves the availability sum
index (stripe_session_id)                -- serves keepalive, release, confirm
```

`status`:
- `open` — held, counts toward reserved while `expires_at > now()`
- `released` — returned early by beacon, webhook, or cart change
- `confirmed` — paid; stock has been deducted from `inventory.quantity`

An expired `open` row and a `released` row are equivalent for availability. Expired rows are left
in place as an audit trail; a later maintenance migration can prune them.

### `inventory.reserved_quantity`

Stops being written. The migration zeroes existing values so no stale number can leak through any
query missed during the port. The column is dropped in a follow-up migration once nothing reads it,
keeping this change backward compatible with a running deployment.

### New view: `variant_availability`

Ten call sites across five repositories currently compute
`inventory.quantity - inventory.reserved_quantity` inline. A single view keeps the definition in
one place and makes the port mechanical.

```sql
CREATE VIEW variant_availability AS
SELECT
  i.variant_id,
  i.quantity,
  i.low_stock_threshold,
  coalesce(r.reserved, 0) AS reserved_quantity,
  i.quantity - coalesce(r.reserved, 0) AS available_quantity
FROM inventory i
LEFT JOIN LATERAL (
  SELECT sum(cr.quantity) AS reserved
  FROM checkout_reservations cr
  WHERE cr.variant_id = i.variant_id
    AND cr.status = 'open'
    AND cr.expires_at > now()
) r ON true;
```

Declared in Drizzle with `pgView(...).existing()` so the schema stays the source of truth for types
while the SQL lives in the migration.

## Components

### `lib/repositories/reservation-repository.ts` (new)

Owns every read and write of `checkout_reservations`.

- `createForSession({ stripeSessionId, items, ttlMs })` — inserts one row per item inside a
  transaction, each guarded by an availability check. Insufficient stock on any item rolls back the
  whole transaction and returns `null`.

  A view cannot be locked, so the check cannot simply read `variant_availability` — two concurrent
  checkouts would both see the last unit as available. Each item therefore takes a row lock on its
  `inventory` row first, which serialises all reservation attempts for that variant:

  ```sql
  SELECT quantity FROM inventory WHERE variant_id = $1 FOR UPDATE;         -- serialises per variant
  SELECT coalesce(sum(quantity), 0) FROM checkout_reservations
   WHERE variant_id = $1 AND status = 'open' AND expires_at > now();       -- live reserved
  -- quantity - reserved >= requested ? insert : abort transaction
  ```

  Items are locked in sorted `variant_id` order so two multi-item carts can never deadlock by
  acquiring the same locks in opposite order. A variant with no `inventory` row is untracked and is
  treated as unlimited, matching current behaviour.
- `extendSession(stripeSessionId, ttlMs)` — pushes `expires_at` for open rows on that session.
  Returns the number of rows extended; zero means the session is gone or already settled.
- `releaseSession(stripeSessionId)` — flips open rows to `released`. Idempotent.
- `confirmSession(stripeSessionId)` — flips open rows to `confirmed`. Idempotent.
- `getReservedForVariants(variantIds)` — batched live sums. No N+1.

### `lib/repositories/checkout-session-repository.ts` (modified)

Keeps session identity (`cart_signature`, reuse, status) and delegates all stock holding to the
reservation repository. `reserved_items` jsonb is no longer read or written.

### `lib/repositories/inventory-repository.ts` (modified)

- `reserve` / `release` are removed — reservations are no longer counter mutations.
- `confirm(variantId, quantity)` decrements `inventory.quantity` directly rather than requiring a
  live reservation, so a lapsed hold cannot silently skip the deduction. If the decrement would
  take quantity below zero it still applies and returns an `oversold` flag for the caller to log.
- `decrementForSale` (POS) and `listVariantInventoryForAdmin` read `variant_availability`.

### `app/api/checkout/keepalive/route.ts` (new)

`POST` with `{ sessionId }`. Calls `extendSession`. Rate limited per IP using the existing Upstash
limiter. Returns `{ ok: true }` on extend, `404` when no open rows exist so the client can stop
polling. Input validated with Zod in `lib/utils/validators.ts`.

### `app/api/checkout/route.ts` (modified)

`DELETE` handler added: `{ sessionId }` → `releaseSession`. Accepts `sendBeacon` requests, whose
body arrives as `text/plain`, so the handler parses the raw body rather than relying on the
content type.

`POST` is unchanged in shape; the reservation call is swapped for the new repository, and the TTL
constant becomes `RESERVATION_TTL_MS = 5 * 60 * 1000`, separate from the Stripe session's 30-minute
`expires_at`.

### `components/shop/checkout-embedded.tsx` (modified)

- Keepalive interval every 90s while a session is ready; cleared on unmount and on a `404` response.
- `pagehide` listener firing `navigator.sendBeacon('/api/checkout', JSON.stringify({ sessionId }))`.
  `pagehide` is used rather than `beforeunload` because it fires reliably on mobile Safari.
- Effect no longer returns early without releasing when the cart empties: an empty cart fires the
  beacon path first.

### Read-site port

`variant_availability` replaces inline arithmetic in:

- `lib/repositories/product-repository.ts:680`, `:1218`, `:1290`
- `lib/repositories/admin-dashboard-repository.ts:99`, `:133`, `:249`, `:258`, `:261`
- `lib/repositories/analytics-repository.ts:99`
- `lib/repositories/order-repository.ts:662`
- `lib/repositories/inventory-repository.ts:30`

### `app/api/webhooks/stripe/route.ts` (modified)

- `checkout.session.completed` → `confirmSession` plus a direct `inventory.quantity` decrement.
  An oversell logs an `inventory.oversold` order event instead of failing silently.
- `checkout.session.expired` and `async_payment_failed` → `releaseSession`.

## Data flow

Reserve:

```
POST /api/checkout
  → resolve cart, create Stripe session
  → reservationRepository.createForSession(ttl = 5 min)
      per item, in sorted variant_id order:
        lock inventory row FOR UPDATE
        live reserved = sum(open, unexpired reservations)
        quantity - reserved >= qty ? insert row : rollback everything
  → out of stock → expire Stripe session, 409
```

Hold alive:

```
checkout page mounted → POST /api/checkout/keepalive every 90s
  → UPDATE checkout_reservations SET expires_at = now() + 5 min
     WHERE stripe_session_id = ? AND status = 'open'
```

Release (any of, all idempotent):

```
pagehide / cart emptied  → DELETE /api/checkout    → status = 'released'
checkout.session.expired → webhook                 → status = 'released'
keepalive stops          → expires_at passes       → row stops counting (no code runs)
```

Confirm:

```
checkout.session.completed
  → status = 'confirmed'
  → inventory.quantity -= qty  (oversell logged, never silent)
```

## Error handling

- Availability check and inserts run in one transaction. Partial reservations are impossible.
- Keepalive failure is non-fatal: the client retries on the next tick, and the reservation survives
  as long as one keepalive lands inside the 5-minute window.
- `sendBeacon` is fire-and-forget with no response. Expiry is the fallback, so a dropped beacon
  costs at most 5 minutes of held stock.
- Every release and confirm operation is status-guarded, so duplicate webhook deliveries and a
  beacon racing a webhook cannot double-apply.
- Oversell at confirm time is recorded as an order event and surfaced in admin rather than
  swallowed.

## Migration

1. `0011_checkout_reservations.sql` — create table, indexes, and the `variant_availability` view.
2. Backfill open `pending_checkout_sessions` rows into `checkout_reservations`, mapping each
   `reserved_items` entry to a row with the session's existing `expires_at`.
3. `UPDATE inventory SET reserved_quantity = 0` — clears the accumulated bad data described in the
   Problem section.
4. Port all read sites to `variant_availability`.
5. Follow-up migration (separate PR, after a deploy has settled): drop
   `inventory.reserved_quantity` and `pending_checkout_sessions.reserved_items`.

Steps 1–3 are backward compatible with the currently deployed code, which reads a zeroed counter
and therefore over-reports availability by the number of live holds — acceptable for the minutes
between migration and deploy, and strictly better than the current over-reservation.

Rollback: the view and table are additive. Reverting the application code restores the old
behaviour, though `reserved_quantity` will have been zeroed — which is the desired state anyway.

## Tradeoffs

- Every availability read pays an indexed `SUM` over a small, self-pruning row set instead of
  reading one integer. Chosen deliberately: correct by construction beats one integer read at this
  volume.
- Keepalive adds one small request per checkout page per 90 seconds. Rate limited, negligible.
- Rows accumulate. Expired rows are harmless to correctness (they are filtered by `expires_at`) but
  need periodic pruning eventually. Deliberately deferred: at current volume the table stays small,
  and adding a pruning job now would reintroduce the scheduled-job dependency this design removes.

## Success criteria

- A customer opens checkout, then closes the tab. Admin inventory shows the item reserved, then
  shows it free within 5 minutes, with the Stripe webhook endpoint disabled.
- A customer sits on the checkout page for 20 minutes and pays. The reservation is held the whole
  time, and stock is deducted exactly once.
- A customer empties their cart on the checkout page. Stock returns immediately.
- Two browsers race for the last unit. The second is refused at checkout creation with the existing
  409, not oversold.
- `inventory.reserved_quantity` is never written by application code after this change.

## Out of scope

- Dropping `reserved_quantity` and `reserved_items` (follow-up migration).
- Pruning expired reservation rows.
- Server-side cart identity to replace the `localStorage` session id. Under this design a lost
  session id costs at most 5 minutes of stale hold rather than a permanent leak, so it is no longer
  urgent.
