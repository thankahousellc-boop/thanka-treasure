import { NextResponse } from "next/server";

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

  return NextResponse.json({ ok: true });
}
