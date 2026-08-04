#!/usr/bin/env node

/**
 * Verifies the expiring-reservation model is intact:
 *   1. the availability view exists and is queryable
 *   2. reserved stock matches the live holds it is derived from
 *   3. the legacy `inventory.reserved_quantity` counter stays at zero
 *   4. no variant is oversold
 *
 * Checks 2 and 4 are the ones that catch a regression: reserved stock is
 * derived, so a mismatch means something started writing it by hand again.
 */

import postgres from "postgres";

import { loadEnvFiles } from "./load-env.mjs";

loadEnvFiles();

const connectionString = (
  process.env.DIRECT_DATABASE_URL ??
  process.env.DATABASE_URL ??
  ""
).trim();

if (!connectionString) {
  console.error(
    "[verify:reservations] DIRECT_DATABASE_URL or DATABASE_URL is required.",
  );
  process.exit(1);
}

const client = postgres(connectionString, {
  max: 1,
  prepare: false,
  connect_timeout: 8,
  idle_timeout: 5,
});

let failed = false;

function report(name, ok, detail) {
  const status = ok ? "PASS" : "FAIL";
  console.log(
    `[verify:reservations] ${status} ${name}${detail ? ` — ${detail}` : ""}`,
  );
  if (!ok) {
    failed = true;
  }
}

async function main() {
  const [view] = await client`
    select count(*)::int as total from variant_availability
  `;
  report("availability view queryable", true, `${view.total} variants`);

  const [drift] = await client`
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
  report(
    "reserved matches live holds",
    drift.total === 0,
    `${drift.total} mismatched`,
  );

  const [counter] = await client`
    select count(*)::int as total from inventory where reserved_quantity <> 0
  `;
  report(
    "legacy reserved_quantity stays zero",
    counter.total === 0,
    `${counter.total} non-zero rows`,
  );

  const [oversold] = await client`
    select count(*)::int as total
    from variant_availability
    where available_quantity < 0
  `;
  report(
    "no oversold variants",
    oversold.total === 0,
    `${oversold.total} negative`,
  );

  const [held] = await client`
    select coalesce(sum(quantity), 0)::int as total
    from checkout_reservations
    where status = 'open' and expires_at > now()
  `;
  console.log(
    `[verify:reservations] ${held.total} unit(s) currently held by live checkouts.`,
  );
}

try {
  await main();
} catch (error) {
  console.error(
    `[verify:reservations] Verification failed to run: ${error.message}`,
  );
  failed = true;
} finally {
  await client.end();
}

if (failed) {
  console.error("[verify:reservations] One or more checks failed.");
  process.exit(1);
}

console.log("[verify:reservations] All reservation checks passed.");
