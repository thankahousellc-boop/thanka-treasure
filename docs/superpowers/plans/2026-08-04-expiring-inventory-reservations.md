# Expiring Inventory Reservations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mutable `inventory.reserved_quantity` counter with expiring per-item reservation rows, so an abandoned checkout releases its stock automatically instead of leaking it permanently.

**Architecture:** A new `checkout_reservations` table holds one row per reserved variant, each with an `expires_at`. Reserved stock becomes a live `SUM` over rows that are still `open` and unexpired, exposed through a `variant_availability` SQL view that every read site joins. The checkout page sends a keepalive every 90s that pushes `expires_at` forward, so active shoppers keep their hold while abandoned ones lapse within 5 minutes. Webhook and page-leave releases remain, but only to return stock early.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict, Drizzle ORM 0.44 on postgres-js, Supabase Postgres, Zod, Stripe, Upstash rate limiting.

**Spec:** `docs/superpowers/specs/2026-08-04-expiring-inventory-reservations-design.md`

## Global Constraints

- TypeScript strict. No `any`. No `@ts-ignore`.
- Absolute imports only (`@/lib/...`). Never `../../`.
- Named exports for repositories, utils, and hooks. Default export only for React components.
- No barrel files. Import direct from the module that defines the symbol.
- All route input validated with Zod schemas declared in `lib/utils/validators.ts`.
- Architecture layering: route handler → repository. Route handlers never import `getDb()` directly.
- Reservation TTL is exactly 5 minutes. Keepalive interval is exactly 90 seconds. Both live in `lib/checkout/reservation-config.ts` and are never re-declared inline.
- Stripe's own session `expires_at` stays at 30 minutes (Stripe enforces a 30-minute minimum). It is independent of the reservation TTL and must not be changed.
- Reservation status values are exactly `open`, `released`, `confirmed`.
- This repo has **no test framework**, and project convention (`.claude/skills/my-coding-style`) is tests only when asked. Verification in this plan is: `npx tsc --noEmit`, `pnpm lint`, the committed `scripts/verify-reservations.mjs` script, and the explicit manual checks written into each task. Do not add a test framework.
- Commits use Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
- Migrations must be backward compatible with the currently deployed code. Do not drop `inventory.reserved_quantity` or `pending_checkout_sessions.reserved_items` in this plan.

---

### Task 1: Reservation config constants

**Files:**
- Create: `lib/checkout/reservation-config.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `RESERVATION_TTL_MS: number` (300000), `KEEPALIVE_INTERVAL_MS: number` (90000), `RESERVATION_STATUS` const object with `OPEN`/`RELEASED`/`CONFIRMED` string values, and `type ReservationStatus`.

- [ ] **Step 1: Create the config module**

```ts
// lib/checkout/reservation-config.ts

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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0, no output.

- [ ] **Step 3: Commit**

```bash
git add lib/checkout/reservation-config.ts
git commit -m "feat: add checkout reservation config constants"
```

---

### Task 2: Schema, migration, and availability view

**Files:**
- Modify: `db/schema/orders.ts` (append after the `pendingCheckoutSessions` table, currently ending at line 179)
- Modify: `db/schema/products.ts` (append the view declaration at end of file)
- Create: `drizzle/migrations/0011_checkout_reservations.sql` (generated, then hand-edited)

**Interfaces:**
- Consumes: `RESERVATION_STATUS` from Task 1 (documentation only; the schema stores plain text).
- Produces: `checkoutReservations` table object exported from `@/db/schema/orders`, and `variantAvailability` view object exported from `@/db/schema/products` with columns `variantId`, `quantity`, `lowStockThreshold`, `reservedQuantity`, `availableQuantity`.

- [ ] **Step 1: Add the table to the schema**

Append to `db/schema/orders.ts`. The existing imports at the top of that file already include `index`, `integer`, `pgTable`, `text`, `timestamp`, and `uuid` — verify before adding, and extend the import list only if something is missing.

```ts
// One row per variant held by a live checkout. This table is the single source
// of truth for reserved stock: a row counts only while `status = 'open'` AND
// `expires_at > now()`, so an abandoned checkout releases its hold with no code
// running and nothing to clean up. `inventory.reserved_quantity` is no longer
// written by application code.
export const checkoutReservations = pgTable(
  "checkout_reservations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stripeSessionId: text("stripe_session_id").notNull(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    // open = held, released = returned early, confirmed = paid and deducted.
    status: text("status").notNull().default("open"),
    // Pushed forward by the checkout page keepalive. Past this instant the row
    // stops counting toward reserved stock.
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Serves the live reserved sum per variant.
    index("checkout_reservations_variant_live_idx").on(
      table.variantId,
      table.status,
      table.expiresAt,
    ),
    // Serves keepalive, release, and confirm, which all key on the session.
    index("checkout_reservations_session_idx").on(table.stripeSessionId),
  ],
);
```

`productVariants` is defined in `db/schema/products.ts`. Add the import at the top of `db/schema/orders.ts` if it is not already there:

```ts
import { productVariants } from "./products";
```

- [ ] **Step 2: Declare the view in the schema**

Append to `db/schema/products.ts`. Add `pgView` to the existing `drizzle-orm/pg-core` import list.

```ts
// Reserved stock is derived, never stored: it is the live sum of open,
// unexpired rows in `checkout_reservations`. Every availability read joins this
// view so the definition exists in exactly one place.
//
// `.existing()` tells drizzle-kit the view is created by hand-written migration
// SQL and must not be generated or diffed.
export const variantAvailability = pgView("variant_availability", {
  variantId: uuid("variant_id").notNull(),
  quantity: integer("quantity").notNull(),
  lowStockThreshold: integer("low_stock_threshold").notNull(),
  reservedQuantity: integer("reserved_quantity").notNull(),
  availableQuantity: integer("available_quantity").notNull(),
}).existing();
```

- [ ] **Step 3: Generate the migration**

Run: `pnpm db:generate`
Expected: a new file `drizzle/migrations/0011_<random_name>.sql` containing `CREATE TABLE "checkout_reservations"` plus its two indexes and the foreign key, and an updated `drizzle/migrations/meta/_journal.json`.

Rename the generated `.sql` file to `0011_checkout_reservations.sql` and update the matching `tag` field in `drizzle/migrations/meta/_journal.json` so it stays in sync.

- [ ] **Step 4: Append the view, backfill, and counter reset to the migration**

Add to the bottom of `drizzle/migrations/0011_checkout_reservations.sql`:

```sql
--> statement-breakpoint
CREATE VIEW "variant_availability" AS
SELECT
  i.variant_id,
  i.quantity,
  i.low_stock_threshold,
  coalesce(r.reserved, 0)::int AS reserved_quantity,
  (i.quantity - coalesce(r.reserved, 0))::int AS available_quantity
FROM inventory i
LEFT JOIN LATERAL (
  SELECT sum(cr.quantity) AS reserved
  FROM checkout_reservations cr
  WHERE cr.variant_id = i.variant_id
    AND cr.status = 'open'
    AND cr.expires_at > now()
) r ON true;
--> statement-breakpoint
-- Carry live holds across so a checkout in flight during deploy is not lost.
INSERT INTO checkout_reservations (stripe_session_id, variant_id, quantity, status, expires_at)
SELECT
  p.stripe_checkout_session_id,
  (item ->> 'variantId')::uuid,
  (item ->> 'quantity')::int,
  'open',
  p.expires_at
FROM pending_checkout_sessions p
CROSS JOIN LATERAL jsonb_array_elements(p.reserved_items) AS item
WHERE p.status = 'open'
  AND p.expires_at > now()
  AND item ->> 'variantId' IS NOT NULL;
--> statement-breakpoint
-- Clears reservations leaked by the old counter. Nothing writes this column
-- after this migration; it is dropped in a follow-up once no code reads it.
UPDATE inventory SET reserved_quantity = 0 WHERE reserved_quantity <> 0;
```

- [ ] **Step 5: Apply the migration locally**

Run: `pnpm db:migrate`
Expected: output ends without error and reports the `0011` migration applied.

- [ ] **Step 6: Verify the view returns rows**

Run: `pnpm db:studio` and open the `variant_availability` view, or query directly against `$DIRECT_DATABASE_URL`:

```bash
psql "$DIRECT_DATABASE_URL" -c "SELECT variant_id, quantity, reserved_quantity, available_quantity FROM variant_availability LIMIT 5;"
```

Expected: one row per inventory row, `reserved_quantity` is `0` for all of them (nothing is held yet), and `available_quantity` equals `quantity`.

- [ ] **Step 7: Verify the schema round-trips**

Run: `pnpm db:parity`
Expected: exits 0 reporting no drift between schema and database.

- [ ] **Step 8: Typecheck and commit**

```bash
npx tsc --noEmit
git add db/schema/orders.ts db/schema/products.ts drizzle/migrations
git commit -m "feat: add checkout_reservations table and variant_availability view"
```

---

### Task 3: Reservation repository

**Files:**
- Create: `lib/repositories/reservation-repository.ts`

**Interfaces:**
- Consumes: `checkoutReservations` from `@/db/schema/orders`, `inventory` from `@/db/schema/products`, `RESERVATION_STATUS` and `RESERVATION_TTL_MS` from `@/lib/checkout/reservation-config`.
- Produces: `reservationRepository` with:
  - `createForSession(input: { stripeSessionId: string; items: ReservationItem[]; ttlMs?: number }): Promise<boolean>` — `true` on success, `false` when any item lacks stock (nothing is reserved).
  - `extendSession(stripeSessionId: string, ttlMs?: number): Promise<number>` — count of rows extended.
  - `releaseSession(stripeSessionId: string): Promise<number>` — count of rows released.
  - `confirmSession(stripeSessionId: string): Promise<number>` — count of rows confirmed.
  - `getReservedForVariants(variantIds: string[]): Promise<Map<string, number>>`
  - `type ReservationItem = { variantId: string; quantity: number }`

- [ ] **Step 1: Write the repository**

```ts
// lib/repositories/reservation-repository.ts
import { and, eq, gt, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { checkoutReservations } from "@/db/schema/orders";
import {
  RESERVATION_STATUS,
  RESERVATION_TTL_MS,
} from "@/lib/checkout/reservation-config";

export type ReservationItem = {
  variantId: string;
  quantity: number;
};

/**
 * Live reserved quantity for a variant: open rows that have not expired.
 * Reused by the guarded insert below and by any caller needing the raw number.
 */
function liveReservedSql(variantId: string) {
  return sql<number>`(
    select coalesce(sum(cr.quantity), 0)::int
    from ${checkoutReservations} cr
    where cr.variant_id = ${variantId}
      and cr.status = ${RESERVATION_STATUS.OPEN}
      and cr.expires_at > now()
  )`;
}

export const reservationRepository = {
  /**
   * Holds every item for one checkout session, or nothing at all.
   *
   * A view cannot be locked, so availability is not read from
   * `variant_availability` here: two concurrent checkouts would both see the
   * last unit as free. Each item takes a `FOR UPDATE` lock on its `inventory`
   * row first, which serialises every reservation attempt for that variant.
   * Items are locked in sorted variantId order so two multi-item carts can
   * never deadlock by taking the same locks in opposite order.
   *
   * A variant with no `inventory` row is untracked stock and is treated as
   * unlimited, matching the behaviour this replaces.
   */
  async createForSession(input: {
    stripeSessionId: string;
    items: ReservationItem[];
    ttlMs?: number;
  }): Promise<boolean> {
    const db = getDb();
    const ttlMs = input.ttlMs ?? RESERVATION_TTL_MS;
    const expiresAt = new Date(Date.now() + ttlMs);

    const ordered = [...input.items].sort((a, b) =>
      a.variantId.localeCompare(b.variantId),
    );

    try {
      await db.transaction(async (tx) => {
        for (const item of ordered) {
          const locked = await tx.execute<{ quantity: number }>(
            sql`select quantity from inventory where variant_id = ${item.variantId} for update`,
          );

          // No inventory row = untracked variant, unlimited stock. Skip it.
          if (locked.length === 0) {
            continue;
          }

          const [reservedRow] = await tx.execute<{ reserved: number }>(
            sql`select ${liveReservedSql(item.variantId)} as reserved`,
          );

          const quantity = Number(locked[0]?.quantity ?? 0);
          const reserved = Number(reservedRow?.reserved ?? 0);

          if (quantity - reserved < item.quantity) {
            throw new InsufficientStockError(item.variantId);
          }

          await tx.insert(checkoutReservations).values({
            stripeSessionId: input.stripeSessionId,
            variantId: item.variantId,
            quantity: item.quantity,
            status: RESERVATION_STATUS.OPEN,
            expiresAt,
          });
        }
      });

      return true;
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        return false;
      }
      throw error;
    }
  },

  /** Pushes the hold forward. Returns 0 when the session has no live rows. */
  async extendSession(
    stripeSessionId: string,
    ttlMs = RESERVATION_TTL_MS,
  ): Promise<number> {
    const db = getDb();
    const expiresAt = new Date(Date.now() + ttlMs);

    const rows = await db
      .update(checkoutReservations)
      .set({ expiresAt, updatedAt: new Date() })
      .where(
        and(
          eq(checkoutReservations.stripeSessionId, stripeSessionId),
          eq(checkoutReservations.status, RESERVATION_STATUS.OPEN),
        ),
      )
      .returning({ id: checkoutReservations.id });

    return rows.length;
  },

  /** Returns stock early. Idempotent: already-settled rows are untouched. */
  async releaseSession(stripeSessionId: string): Promise<number> {
    const db = getDb();

    const rows = await db
      .update(checkoutReservations)
      .set({ status: RESERVATION_STATUS.RELEASED, updatedAt: new Date() })
      .where(
        and(
          eq(checkoutReservations.stripeSessionId, stripeSessionId),
          eq(checkoutReservations.status, RESERVATION_STATUS.OPEN),
        ),
      )
      .returning({ id: checkoutReservations.id });

    return rows.length;
  },

  /**
   * Marks a paid session's rows confirmed so a late `expired` webhook cannot
   * release stock that has already been sold. Idempotent.
   */
  async confirmSession(stripeSessionId: string): Promise<number> {
    const db = getDb();

    const rows = await db
      .update(checkoutReservations)
      .set({ status: RESERVATION_STATUS.CONFIRMED, updatedAt: new Date() })
      .where(
        and(
          eq(checkoutReservations.stripeSessionId, stripeSessionId),
          eq(checkoutReservations.status, RESERVATION_STATUS.OPEN),
        ),
      )
      .returning({ id: checkoutReservations.id });

    return rows.length;
  },

  /** Batched live sums. Variants with no live hold are absent from the map. */
  async getReservedForVariants(
    variantIds: string[],
  ): Promise<Map<string, number>> {
    if (variantIds.length === 0) {
      return new Map();
    }

    const db = getDb();

    const rows = await db
      .select({
        variantId: checkoutReservations.variantId,
        reserved: sql<number>`coalesce(sum(${checkoutReservations.quantity}), 0)::int`,
      })
      .from(checkoutReservations)
      .where(
        and(
          inArray(checkoutReservations.variantId, variantIds),
          eq(checkoutReservations.status, RESERVATION_STATUS.OPEN),
          gt(checkoutReservations.expiresAt, new Date()),
        ),
      )
      .groupBy(checkoutReservations.variantId);

    return new Map(rows.map((row) => [row.variantId, Number(row.reserved)]));
  },
};

class InsufficientStockError extends Error {
  variantId: string;

  constructor(variantId: string) {
    super(`Insufficient stock for variant ${variantId}.`);
    this.name = "InsufficientStockError";
    this.variantId = variantId;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0. If `tx.execute` returns a shape mismatch, note that postgres-js returns an array-like result; index it directly as written rather than reaching for `.rows`.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors for `lib/repositories/reservation-repository.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/repositories/reservation-repository.ts
git commit -m "feat: add reservation repository with locked availability check"
```

---

### Task 4: Wire checkout session creation to reservations

**Files:**
- Modify: `lib/repositories/checkout-session-repository.ts` (replace `createWithReservation`, `releaseByRow`, `releaseBySessionId`, `markCompletedBySessionId` internals — lines 71–207)
- Modify: `app/api/checkout/route.ts` (TTL constant at line 19, release path at line 574, reservation call at lines 715–724)

**Interfaces:**
- Consumes: `reservationRepository` from Task 3, `RESERVATION_TTL_MS` from Task 1.
- Produces: `checkoutSessionRepository.createSession(input)` returning `PendingRow | null`, and `checkoutSessionRepository.releaseByRow` / `releaseBySessionId` now delegating stock return to `reservationRepository.releaseSession`.

- [ ] **Step 1: Replace `createWithReservation` with `createSession`**

In `lib/repositories/checkout-session-repository.ts`, replace the whole `createWithReservation` method (lines 71–145) and delete the now-unused `InsufficientStockError` class at the bottom of the file plus the `gte` and `inventory` imports:

```ts
  // Records the pending session and holds stock for it. Stock holding lives in
  // the reservation repository; this repository owns session identity only.
  // Returns null when any item lacks stock, with nothing reserved.
  async createSession(input: {
    stripeSessionId: string;
    cartSignature: string;
    currency: string;
    expiresAt: Date;
    items: ReservedItem[];
  }): Promise<PendingRow | null> {
    const reserved = await reservationRepository.createForSession({
      stripeSessionId: input.stripeSessionId,
      items: input.items,
    });

    if (!reserved) {
      return null;
    }

    const db = getDb();
    const [row] = await db
      .insert(pendingCheckoutSessions)
      .values({
        stripeCheckoutSessionId: input.stripeSessionId,
        cartSignature: input.cartSignature,
        currency: input.currency.toUpperCase(),
        // Superseded by checkout_reservations; written as [] until the column
        // is dropped in the follow-up migration.
        reservedItems: [],
        status: "open",
        expiresAt: input.expiresAt,
        updatedAt: new Date(),
      })
      .returning();

    if (!row) {
      await reservationRepository.releaseSession(input.stripeSessionId);
      return null;
    }

    return row;
  },
```

Add the import at the top of the file:

```ts
import { reservationRepository } from "@/lib/repositories/reservation-repository";
```

- [ ] **Step 2: Rewrite the release methods to delegate**

Replace `releaseByRow` (lines 150–182) with:

```ts
  // Flips the session row to `released` and returns its stock early. Idempotent:
  // a row already released or completed returns false and touches nothing, so
  // the replace path, the beacon, and the webhook can never conflict.
  async releaseByRow(rowId: string): Promise<boolean> {
    const db = getDb();

    const [row] = await db
      .update(pendingCheckoutSessions)
      .set({ status: "released", updatedAt: new Date() })
      .where(
        and(
          eq(pendingCheckoutSessions.id, rowId),
          eq(pendingCheckoutSessions.status, "open"),
        ),
      )
      .returning();

    if (!row) {
      return false;
    }

    await reservationRepository.releaseSession(row.stripeCheckoutSessionId);
    return true;
  },
```

Then update `markCompletedBySessionId` (lines 195–206) to confirm the reservation rows in the same call:

```ts
  // Marks the row completed on successful payment so a late `expired` webhook
  // cannot release stock that was already sold.
  async markCompletedBySessionId(stripeSessionId: string): Promise<void> {
    const db = getDb();
    await db
      .update(pendingCheckoutSessions)
      .set({ status: "completed", updatedAt: new Date() })
      .where(
        eq(
          pendingCheckoutSessions.stripeCheckoutSessionId,
          stripeSessionId,
        ),
      );

    await reservationRepository.confirmSession(stripeSessionId);
  },
```

- [ ] **Step 3: Update the checkout route**

In `app/api/checkout/route.ts`, replace the TTL comment and constant at lines 17–19:

```ts
// Stripe requires a session to live at least 30 minutes, so that is what the
// Stripe session gets. Our inventory hold is separate and much shorter — see
// RESERVATION_TTL_MS — because it expires on our clock and therefore does not
// depend on the `checkout.session.expired` webhook arriving.
const SESSION_TTL_MS = 30 * 60 * 1000;
```

Then replace the reservation call at lines 715–724:

```ts
  // Hold stock and record the pending session. Out of stock holds nothing; we
  // then expire the just-created Stripe session so it cannot be paid for stock
  // we do not have.
  const reservation = await checkoutSessionRepository.createSession({
    stripeSessionId: session.id,
    cartSignature,
    currency,
    expiresAt: reservationExpiresAt,
    items: resolvedItems.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
    })),
  });
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: exits 0. Any error naming `createWithReservation` means a call site was missed — search with `grep -rn "createWithReservation" app lib` and update it.

- [ ] **Step 5: Manual check — a hold appears**

Run `pnpm dev`, add an item to the cart, and open `/checkout`. Then:

```bash
psql "$DIRECT_DATABASE_URL" -c "SELECT stripe_session_id, variant_id, quantity, status, expires_at FROM checkout_reservations ORDER BY created_at DESC LIMIT 3;"
```

Expected: one `open` row per cart item, `expires_at` roughly 5 minutes ahead of now.

```bash
psql "$DIRECT_DATABASE_URL" -c "SELECT variant_id, quantity, reserved_quantity, available_quantity FROM variant_availability WHERE reserved_quantity > 0;"
```

Expected: the held variant shows `reserved_quantity` matching the cart quantity and `available_quantity` reduced by it.

- [ ] **Step 6: Commit**

```bash
git add lib/repositories/checkout-session-repository.ts app/api/checkout/route.ts
git commit -m "feat: hold checkout stock via expiring reservation rows"
```

---

### Task 5: Keepalive endpoint

**Files:**
- Modify: `lib/utils/validators.ts` (append after `checkoutSchema`)
- Create: `app/api/checkout/keepalive/route.ts`

**Interfaces:**
- Consumes: `reservationRepository.extendSession` from Task 3, `enforceRateLimit` from `@/lib/rate-limit`.
- Produces: `checkoutKeepaliveSchema` Zod schema; `POST /api/checkout/keepalive` accepting `{ sessionId: string }`, returning `200 { ok: true }`, `404 { error }` when no live hold exists, `400` on invalid input, `429` when rate limited.

- [ ] **Step 1: Add the Zod schema**

Append to `lib/utils/validators.ts`:

```ts
export const checkoutKeepaliveSchema = z.object({
  sessionId: z.string().trim().min(1).max(255),
});
```

- [ ] **Step 2: Create the route**

```ts
// app/api/checkout/keepalive/route.ts
import { NextResponse } from "next/server";

import { monitor } from "@/lib/monitoring/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { reservationRepository } from "@/lib/repositories/reservation-repository";
import { checkoutKeepaliveSchema } from "@/lib/utils/validators";

/**
 * Pushes a live inventory hold forward while the checkout page stays open.
 * The client calls this every KEEPALIVE_INTERVAL_MS. A 404 means the hold is
 * gone (expired, released, or paid) and the client must stop polling.
 */
export async function POST(request: Request) {
  // `standard` not `strict`: this fires every 90s per open checkout page, which
  // would exhaust the 5-per-minute strict bucket on a normal checkout.
  const limited = await enforceRateLimit("standard", request);
  if (limited) {
    return limited;
  }

  const body = await request.json().catch(() => null);
  const parsed = checkoutKeepaliveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid keepalive payload." },
      { status: 400 },
    );
  }

  const extended = await reservationRepository.extendSession(
    parsed.data.sessionId,
  );

  if (extended === 0) {
    return NextResponse.json(
      { error: "No live reservation for this session." },
      { status: 404 },
    );
  }

  monitor.debug?.("Checkout reservation extended.", {
    route: "/api/checkout/keepalive",
    sessionId: parsed.data.sessionId,
    rows: extended,
  });

  return NextResponse.json({ ok: true });
}
```

Before writing this, open `lib/monitoring/logger.ts` and confirm which methods `monitor` exposes. If there is no `debug`, drop the logging block entirely rather than inventing a method.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: exits 0.

- [ ] **Step 4: Manual check — extend and miss**

With `pnpm dev` running and a live hold from Task 5 Step 5, take the `stripe_session_id` from that row:

```bash
curl -s -X POST localhost:3000/api/checkout/keepalive \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"cs_test_REPLACE_ME"}'
```

Expected: `{"ok":true}`, and re-querying `checkout_reservations` shows `expires_at` moved ~5 minutes into the future.

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/checkout/keepalive \
  -H 'Content-Type: application/json' -d '{"sessionId":"cs_test_does_not_exist"}'
```

Expected: `404`.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/validators.ts app/api/checkout/keepalive/route.ts
git commit -m "feat: add checkout reservation keepalive endpoint"
```

---

### Task 6: Beacon release endpoint

**Files:**
- Modify: `lib/utils/validators.ts` (append after `checkoutKeepaliveSchema`)
- Modify: `app/api/checkout/route.ts` (add a `DELETE` export at end of file)

**Interfaces:**
- Consumes: `reservationRepository.releaseSession` from Task 3, `checkoutSessionRepository.releaseBySessionId` from Task 4.
- Produces: `checkoutReleaseSchema`; `DELETE /api/checkout` accepting `{ sessionId: string }` as a raw body, always returning `202`.

- [ ] **Step 1: Add the Zod schema**

Append to `lib/utils/validators.ts`:

```ts
export const checkoutReleaseSchema = z.object({
  sessionId: z.string().trim().min(1).max(255),
});
```

- [ ] **Step 2: Add the DELETE handler**

Append to `app/api/checkout/route.ts`:

```ts
/**
 * Returns a checkout's held stock early — fired by `navigator.sendBeacon` on
 * page hide and when the cart empties.
 *
 * Always answers 202: a beacon is fire-and-forget and the client cannot read
 * the response, and correctness never depends on this arriving — an unreleased
 * hold expires on its own within RESERVATION_TTL_MS.
 *
 * The body is read as text, not via `request.json()`, because `sendBeacon`
 * sends a Blob with `text/plain` (or no content type at all) and the JSON
 * helper rejects it.
 */
export async function DELETE(request: Request) {
  const raw = await request.text().catch(() => "");

  let payload: unknown = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const parsed = checkoutReleaseSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  await checkoutSessionRepository.releaseBySessionId(parsed.data.sessionId);

  return NextResponse.json({ ok: true }, { status: 202 });
}
```

Extend the validator import at the top of the file:

```ts
import { checkoutReleaseSchema, checkoutSchema } from "@/lib/utils/validators";
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: exits 0.

- [ ] **Step 4: Manual check — release returns stock**

With a live hold in the table:

```bash
curl -s -X DELETE localhost:3000/api/checkout \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"cs_test_REPLACE_ME"}'
psql "$DIRECT_DATABASE_URL" -c "SELECT status FROM checkout_reservations WHERE stripe_session_id = 'cs_test_REPLACE_ME';"
```

Expected: rows read `released`, and `variant_availability` shows `reserved_quantity = 0` for that variant.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/validators.ts app/api/checkout/route.ts
git commit -m "feat: release checkout stock via beacon endpoint"
```

---

### Task 7: Checkout page keepalive and release

**Files:**
- Modify: `components/shop/checkout-embedded.tsx` (session effect at lines 146–236; add two effects after it)

**Interfaces:**
- Consumes: `KEEPALIVE_INTERVAL_MS` from Task 1, `POST /api/checkout/keepalive` from Task 5, `DELETE /api/checkout` from Task 6.
- Produces: no exports beyond the existing component and `clearStoredCheckoutSessionId`.

- [ ] **Step 1: Track the active session id in state**

The component currently stores the session id only in `localStorage`. The keepalive and release effects need it as reactive state. Add near the other `useState` calls at line 123:

```tsx
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
```

In the existing session effect, set it wherever the session id is persisted (line 216):

```tsx
        if (payload.sessionId) {
          writeStoredCheckoutSessionId(payload.sessionId);
          setActiveSessionId(payload.sessionId);
        }
```

And clear it on the error path at line 208:

```tsx
          writeStoredCheckoutSessionId(null);
          setActiveSessionId(null);
```

- [ ] **Step 2: Add the keepalive effect**

Add after the session effect:

```tsx
  // Keeps the inventory hold alive while this page is open. The server hold is
  // short (RESERVATION_TTL_MS) so an abandoned tab frees stock quickly; this
  // ping is what stops a slow-but-active shopper from losing their hold.
  useEffect(() => {
    if (!activeSessionId) {
      return;
    }

    let cancelled = false;

    const interval = setInterval(() => {
      void (async () => {
        try {
          const response = await fetch("/api/checkout/keepalive", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: activeSessionId }),
          });

          // 404 = the hold is gone (expired, released, or paid). Stop pinging;
          // the session effect re-creates one if the cart is still live.
          if (!cancelled && response.status === 404) {
            setActiveSessionId(null);
          }
        } catch {
          // Network blip. The next tick retries well inside the hold window.
        }
      })();
    }, KEEPALIVE_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeSessionId]);
```

- [ ] **Step 3: Add the page-leave release effect**

Add after the keepalive effect:

```tsx
  // Returns stock the moment the shopper leaves, instead of waiting out the
  // hold. `pagehide` rather than `beforeunload`: it is the only one that fires
  // reliably when mobile Safari backgrounds a tab.
  useEffect(() => {
    if (!activeSessionId) {
      return;
    }

    const release = () => {
      const body = JSON.stringify({ sessionId: activeSessionId });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/checkout", body);
        return;
      }
      void fetch("/api/checkout", {
        method: "DELETE",
        body,
        keepalive: true,
      });
    };

    window.addEventListener("pagehide", release);
    return () => {
      window.removeEventListener("pagehide", release);
    };
  }, [activeSessionId]);
```

`navigator.sendBeacon` always issues a POST, so the beacon path reaches the route's `POST` handler, not `DELETE`. Add this guard at the very top of the existing `POST` handler in `app/api/checkout/route.ts`, before the rate limit check, so a beacon is routed to the release path:

```ts
  // sendBeacon can only POST, so a release beacon arrives here. Detect it by
  // shape and hand it to the same release logic.
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return DELETE(request);
  }
```

- [ ] **Step 4: Release when the cart empties**

The effect at line 147 returns early on an empty cart, which is how the leak survived a cart being emptied on this page. Replace that guard:

```tsx
    if (items.length === 0) {
      // Cart emptied on this page: hand the hold back now rather than letting
      // it sit until expiry.
      if (activeSessionId) {
        void fetch("/api/checkout", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: activeSessionId }),
        });
        writeStoredCheckoutSessionId(null);
        setActiveSessionId(null);
        requestedKeyRef.current = null;
      }
      return;
    }

    if (hasMixedCurrencies || !stripePromise) {
      return;
    }
```

Add `activeSessionId` to that effect's dependency array.

- [ ] **Step 5: Add the import**

```tsx
import { KEEPALIVE_INTERVAL_MS } from "@/lib/checkout/reservation-config";
```

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: exits 0. React hook dependency warnings must be resolved by fixing the dependency array, never by disabling the rule.

- [ ] **Step 7: Manual check — the original bug**

With `pnpm dev` running:

1. Add an item to the cart, open `/checkout`. Confirm an `open` row exists and `variant_availability.reserved_quantity` is 1.
2. Remove the item from the cart while still on `/checkout`. Re-query: the row reads `released` and `reserved_quantity` is back to 0. **This is the reported bug; it must pass.**
3. Add the item again, open `/checkout`, then close the tab. Re-query immediately: the row reads `released`.
4. Add the item again, open `/checkout`, and leave it open for 4 minutes. Re-query: still `open`, with `expires_at` continuously ~5 minutes ahead. Stock stays held for the active shopper.

- [ ] **Step 8: Commit**

```bash
git add components/shop/checkout-embedded.tsx app/api/checkout/route.ts
git commit -m "feat: keep checkout holds alive and release them on leave"
```

---

### Task 8: Webhook confirm and release

**Files:**
- Modify: `app/api/webhooks/stripe/route.ts` (inventory confirmation at lines 213–242, expiry handler at lines 366–372, async failure handler at lines 346–364)
- Modify: `lib/repositories/inventory-repository.ts` (`confirm` at lines 169–188; delete `reserve` at lines 146–167 and `release` at lines 216–229)

**Interfaces:**
- Consumes: `reservationRepository` from Task 3.
- Produces: `inventoryRepository.confirm(variantId, quantity): Promise<{ ok: boolean; oversold: boolean }>` — a changed return type; the webhook is the only caller.

- [ ] **Step 1: Rewrite `inventoryRepository.confirm`**

Replace lines 169–188 of `lib/repositories/inventory-repository.ts`:

```ts
  /**
   * Deducts sold stock from `quantity`.
   *
   * Deliberately not guarded on a live reservation: a hold can lapse while the
   * shopper is on the payment step, and refusing the deduction there would sell
   * the item without ever reducing stock. The reservation rows are settled
   * separately by `reservationRepository.confirmSession`.
   *
   * A deduction that would go below zero still applies, and reports `oversold`
   * so the caller can record it. A visible negative is recoverable; a silent
   * skip is not.
   */
  async confirm(variantId: string, quantity: number) {
    const db = getDb();

    const [row] = await db
      .update(inventory)
      .set({
        quantity: sql`${inventory.quantity} - ${quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(inventory.variantId, variantId))
      .returning({ quantity: inventory.quantity });

    if (!row) {
      // No inventory row = untracked variant. Nothing to deduct.
      return { ok: true, oversold: false };
    }

    return { ok: true, oversold: Number(row.quantity) < 0 };
  },
```

Delete the `reserve` method (lines 146–167) and the `release` method (lines 216–229). Reservations are no longer counter mutations. Remove the now-unused `gte` import if nothing else in the file uses it — `decrementForSale` still does, so check before removing.

- [ ] **Step 2: Update `decrementForSale` to use live reserved**

`decrementForSale` (POS sales) still guards against `reserved_quantity`, which is now always 0. Replace its `where` clause so it guards against live holds:

```ts
      .where(
        and(
          eq(inventory.variantId, variantId),
          gte(
            sql`${inventory.quantity} - (
              select coalesce(sum(cr.quantity), 0)
              from checkout_reservations cr
              where cr.variant_id = ${inventory.variantId}
                and cr.status = 'open'
                and cr.expires_at > now()
            )`,
            quantity,
          ),
        ),
      )
```

The `UPDATE` takes a row lock on the `inventory` row, so this check is serialised against concurrent POS sales without extra locking.

- [ ] **Step 3: Update the webhook confirmation block**

Replace lines 213–242 of `app/api/webhooks/stripe/route.ts`:

```ts
  const inventoryResults = await Promise.all(
    items
      .filter((item) => Boolean(item.variantId))
      .map(async (item) => {
        const result = await inventoryRepository.confirm(
          item.variantId as string,
          item.quantity,
        );
        return {
          variantId: item.variantId as string,
          quantity: item.quantity,
          ...result,
        };
      }),
  );

  const oversold = inventoryResults.filter((entry) => entry.oversold);
  if (oversold.length > 0) {
    await orderRepository.appendEvent(order.id, {
      eventType: "inventory.oversold",
      description:
        "Stock went negative confirming this order. Review inventory levels.",
      actor: "stripe-webhook",
      metadata: { oversold },
    });
  }

  // Settle the reservation rows and mark the pending session completed so a
  // stray `expired` event can never release stock that has already been sold.
  await checkoutSessionRepository.markCompletedBySessionId(session.id);
```

- [ ] **Step 4: Update the release handlers**

`handleCheckoutExpired` (line 366) and `handleCheckoutAsyncPaymentFailed` (line 346) already call `checkoutSessionRepository.releaseBySessionId`, which now delegates to the reservation repository via Task 4. Add a defensive direct call so a session with no `pending_checkout_sessions` row still frees its reservations:

```ts
async function handleCheckoutExpired(checkoutSessionId: string) {
  await orderRepository.markCheckoutExpired(checkoutSessionId);

  // Belt and braces: release via the pending row, then directly. Both are
  // idempotent and status-guarded, so a double call is a no-op.
  await checkoutSessionRepository.releaseBySessionId(checkoutSessionId);
  await reservationRepository.releaseSession(checkoutSessionId);
}
```

Apply the same extra line to `handleCheckoutAsyncPaymentFailed`, and add the import:

```ts
import { reservationRepository } from "@/lib/repositories/reservation-repository";
```

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: exits 0. An error about `ok` on the confirm result means a caller was not updated — `grep -rn "inventoryRepository.confirm" app lib` and fix it.

- [ ] **Step 6: Manual check — a paid order settles**

With `stripe listen --forward-to localhost:3000/api/webhooks/stripe` running, complete a test checkout with card `4242 4242 4242 4242`.

```bash
psql "$DIRECT_DATABASE_URL" -c "SELECT status FROM checkout_reservations ORDER BY created_at DESC LIMIT 3;"
psql "$DIRECT_DATABASE_URL" -c "SELECT variant_id, quantity, reserved_quantity, available_quantity FROM variant_availability WHERE variant_id = 'REPLACE_WITH_PURCHASED_VARIANT';"
```

Expected: rows read `confirmed`, `quantity` is reduced by the purchased amount, and `reserved_quantity` is 0.

- [ ] **Step 7: Commit**

```bash
git add app/api/webhooks/stripe/route.ts lib/repositories/inventory-repository.ts
git commit -m "feat: settle reservations on payment and release on expiry"
```

---

### Task 9: Port every availability read to the view

**Files:**
- Modify: `lib/repositories/inventory-repository.ts:27-68` (admin inventory list)
- Modify: `lib/repositories/product-repository.ts:680`, `:1218`, `:1290`
- Modify: `lib/repositories/admin-dashboard-repository.ts:99`, `:133`, `:249`, `:258`, `:261`
- Modify: `lib/repositories/analytics-repository.ts:99`
- Modify: `lib/repositories/order-repository.ts:662`

**Interfaces:**
- Consumes: `variantAvailability` view from Task 2.
- Produces: no signature changes. Every returned field keeps its current name and type; only the SQL behind it changes.

- [ ] **Step 1: Port the admin inventory list**

In `lib/repositories/inventory-repository.ts`, replace the four expressions at lines 27–30 and the join at line 48:

```ts
    const quantityExpr = sql<number>`coalesce(${variantAvailability.quantity}, 0)`;
    const reservedQuantityExpr = sql<number>`coalesce(${variantAvailability.reservedQuantity}, 0)`;
    const lowStockThresholdExpr = sql<number>`coalesce(${variantAvailability.lowStockThreshold}, 5)`;
    const availableQuantityExpr = sql<number>`coalesce(${variantAvailability.availableQuantity}, 0)`;
```

```ts
      .leftJoin(
        variantAvailability,
        eq(variantAvailability.variantId, productVariants.id),
      )
```

Add the import:

```ts
import { variantAvailability } from "@/db/schema/products";
```

- [ ] **Step 2: Port `product-repository.ts`**

Line 680 becomes:

```ts
        inventoryCount: sql<number>`coalesce(sum(coalesce(${variantAvailability.availableQuantity}, 0)), 0)::int`,
```

with its join changed to:

```ts
      .leftJoin(
        variantAvailability,
        eq(variantAvailability.variantId, productVariants.id),
      )
```

Lines 1218 and 1290 both become:

```ts
        availableQuantity: sql<number>`coalesce(${variantAvailability.availableQuantity}, 0)`,
```

with the same join replacement in each query. Add the `variantAvailability` import and drop the `inventory` import if nothing else in the file uses it — check with `grep -n "inventory" lib/repositories/product-repository.ts` first.

- [ ] **Step 3: Port `admin-dashboard-repository.ts`**

Lines 99 and 133, low stock and out of stock counts:

```ts
      db
        .select({ total: sql<number>`count(*)` })
        .from(variantAvailability)
        .where(
          sql`${variantAvailability.availableQuantity} <= ${variantAvailability.lowStockThreshold}`,
        )
        .then((rows) => rows[0]),
```

```ts
      db
        .select({ total: sql<number>`count(*)` })
        .from(variantAvailability)
        .where(sql`${variantAvailability.availableQuantity} <= 0`)
        .then((rows) => rows[0]),
```

Lines 249–261, the low stock list:

```ts
    return db
      .select({
        variantId: variantAvailability.variantId,
        variantTitle: productVariants.title,
        productTitle: sql<string>`coalesce(${productVariants.title}, '')`,
        productId: productVariants.productId,
        available: variantAvailability.availableQuantity,
        threshold: variantAvailability.lowStockThreshold,
      })
      .from(variantAvailability)
      .innerJoin(
        productVariants,
        eq(productVariants.id, variantAvailability.variantId),
      )
      .where(
        sql`${variantAvailability.availableQuantity} <= ${variantAvailability.lowStockThreshold}`,
      )
      .orderBy(variantAvailability.availableQuantity)
      .limit(limit);
```

- [ ] **Step 4: Port `analytics-repository.ts`**

Line 99:

```ts
      db
        .select({ total: sql<number>`count(*)` })
        .from(variantAvailability)
        .where(
          sql`${variantAvailability.availableQuantity} <= ${variantAvailability.lowStockThreshold}`,
        )
        .then((rows) => rows[0]),
```

- [ ] **Step 5: Port the POS sale guard in `order-repository.ts`**

Line 662 sits inside an `UPDATE ... WHERE` on `inventory`, which holds a row lock — so it must compute live reserved inline rather than join the view:

```ts
          .where(
            and(
              eq(inventory.variantId, item.variantId),
              gte(
                sql`${inventory.quantity} - (
                  select coalesce(sum(cr.quantity), 0)
                  from checkout_reservations cr
                  where cr.variant_id = ${inventory.variantId}
                    and cr.status = 'open'
                    and cr.expires_at > now()
                )`,
                item.quantity,
              ),
            ),
          )
```

- [ ] **Step 6: Verify no reads of the dead column remain**

Run: `grep -rn "reservedQuantity\|reserved_quantity" app lib db --include='*.ts' --include='*.tsx'`
Expected: hits only in `db/schema/products.ts` (the column definition, kept until the follow-up migration), `db/schema/products.ts` view definition, and `lib/repositories/inventory-repository.ts` where it now reads from `variantAvailability`. No `inventory.reservedQuantity` arithmetic anywhere.

- [ ] **Step 7: Typecheck, lint, build**

Run: `npx tsc --noEmit && pnpm lint && pnpm build`
Expected: all exit 0.

- [ ] **Step 8: Manual check — admin reflects live holds**

Open `/admin/products/inventory` with no live checkout. Expected: every row shows Reserved 0.

Start a checkout in another browser, then reload the admin page. Expected: the held variant shows Reserved matching the cart, Available reduced. Close the checkout tab, wait 5 minutes, reload. Expected: Reserved back to 0.

- [ ] **Step 9: Commit**

```bash
git add lib/repositories
git commit -m "refactor: read stock availability from variant_availability view"
```

---

### Task 10: Verification script and docs

**Files:**
- Create: `scripts/verify-reservations.mjs`
- Modify: `package.json` (scripts block)
- Modify: `docs/SETUP.md` (webhook table around line 232)

**Interfaces:**
- Consumes: `DIRECT_DATABASE_URL` from env, matching the existing `scripts/verify-*.mjs` pattern.
- Produces: `pnpm ops:verify:reservations`.

- [ ] **Step 1: Read an existing verify script for the house pattern**

Run: `sed -n '1,60p' scripts/verify-supabase-setup.mjs`
Match its env loading, output formatting, and exit code conventions in the script below rather than inventing new ones.

- [ ] **Step 2: Write the script**

```js
// scripts/verify-reservations.mjs
// Checks that the expiring-reservation model is intact:
//   1. the view exists and returns rows
//   2. no expired hold is still counted as reserved
//   3. inventory.reserved_quantity is not being written by application code
//   4. no variant is oversold
import postgres from "postgres";

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DIRECT_DATABASE_URL or DATABASE_URL is required.");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
let failed = false;

function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed = true;
}

try {
  const [view] = await sql`
    select count(*)::int as total from variant_availability
  `;
  check("variant_availability view queryable", true, `${view.total} rows`);

  const [stale] = await sql`
    select count(*)::int as total
    from variant_availability va
    where va.reserved_quantity <> (
      select coalesce(sum(cr.quantity), 0)
      from checkout_reservations cr
      where cr.variant_id = va.variant_id
        and cr.status = 'open'
        and cr.expires_at > now()
    )
  `;
  check("reserved matches live holds", stale.total === 0, `${stale.total} mismatched`);

  const [counter] = await sql`
    select count(*)::int as total from inventory where reserved_quantity <> 0
  `;
  check(
    "legacy reserved_quantity stays zero",
    counter.total === 0,
    `${counter.total} non-zero rows`,
  );

  const [oversold] = await sql`
    select count(*)::int as total from variant_availability where available_quantity < 0
  `;
  check("no oversold variants", oversold.total === 0, `${oversold.total} negative`);
} catch (error) {
  console.error("Verification failed to run:", error.message);
  failed = true;
} finally {
  await sql.end();
}

process.exit(failed ? 1 : 0);
```

- [ ] **Step 3: Register the script**

Add to the `scripts` block of `package.json`, after `ops:verify:secrets`:

```json
    "ops:verify:reservations": "node ./scripts/verify-reservations.mjs"
```

- [ ] **Step 4: Run it**

Run: `pnpm ops:verify:reservations`
Expected: four `PASS` lines and exit code 0. Confirm with `echo $?`.

- [ ] **Step 5: Update the setup docs**

In `docs/SETUP.md`, change the webhook table row at line 232 and add a note beneath the table:

```markdown
| `checkout.session.expired` | Release reserved inventory early (optional — holds also expire on their own after 5 minutes) |
```

```markdown
Inventory holds expire on their own clock, so a missed or misconfigured webhook
delays stock returning by at most 5 minutes rather than leaking it permanently.
Run `pnpm ops:verify:reservations` to confirm reserved stock matches live holds.
```

- [ ] **Step 6: Commit**

```bash
git add scripts/verify-reservations.mjs package.json docs/SETUP.md
git commit -m "chore: add reservation verification script and update setup docs"
```

---

## Rollout

Deploy order matters, because the migration zeroes `inventory.reserved_quantity`
while the old code is still running.

1. Run `pnpm db:migrate-prod`. Old code now reads a zeroed counter, so it briefly
   over-reports availability by the number of live holds — a few minutes of mild
   over-availability, strictly better than the current permanent over-reservation.
2. Deploy the application.
3. Run `pnpm ops:verify:reservations` against production.
4. Confirm in Stripe that `checkout.session.expired` is still subscribed. It is
   now an optimisation rather than a correctness dependency, but early release is
   still worth having.

Rollback: revert the deploy. The table and view are additive and harmless to the
old code, and the zeroed counter is the desired state either way.

## Follow-up (not in this plan)

- Drop `inventory.reserved_quantity` and `pending_checkout_sessions.reserved_items`
  once a deploy has settled and nothing reads them.
- Prune `checkout_reservations` rows older than some window. Not urgent: expired
  rows are filtered by `expires_at` and cost nothing in correctness.
- Replace the `localStorage` session id with a server-side cart identity. Under
  this design a lost id costs at most 5 minutes of stale hold rather than a
  permanent leak.
