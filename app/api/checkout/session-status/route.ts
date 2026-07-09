import { NextResponse } from "next/server";

import { enforceRateLimit } from "@/lib/rate-limit";
import { orderRepository } from "@/lib/repositories/order-repository";

type CheckoutSessionStatusResponse = {
  found: boolean;
  order?: {
    orderNumber: string;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    currency: string;
    grandTotal: number;
    createdAt: string;
  };
};

export async function GET(request: Request) {
  const limited = await enforceRateLimit("standard", request);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id")?.trim();

  if (!sessionId) {
    return NextResponse.json(
      { error: "session_id is required." },
      { status: 400 },
    );
  }

  try {
    const order = await orderRepository.findByStripeSessionId(sessionId);

    if (!order) {
      return NextResponse.json<CheckoutSessionStatusResponse>(
        { found: false },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json<CheckoutSessionStatusResponse>(
      {
        found: true,
        order: {
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          fulfillmentStatus: order.fulfillmentStatus,
          currency: order.currency,
          grandTotal: order.grandTotal,
          createdAt: order.createdAt.toISOString(),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to load checkout session status." },
      { status: 500 },
    );
  }
}
