import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { serverEnv } from "@/lib/env";
import { sendOrderConfirmationEmail } from "@/lib/email/transactional";
import { monitor } from "@/lib/monitoring/logger";
import { checkoutSessionRepository } from "@/lib/repositories/checkout-session-repository";
import { discountRepository } from "@/lib/repositories/discount-repository";
import { inventoryRepository } from "@/lib/repositories/inventory-repository";
import { orderRepository } from "@/lib/repositories/order-repository";
import { stripe } from "@/lib/stripe/client";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type FrameSnapshot = {
  id: string;
  name: string;
  imageUrl?: string | null;
  priceDelta: number;
};

type CheckoutLineItem = {
  variantId: string | null;
  productTitle: string;
  variantTitle: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  frameSnapshot: FrameSnapshot | null;
};

type StoredOrder = NonNullable<
  Awaited<ReturnType<typeof orderRepository.findByStripeSessionId>>
>;

function getPaymentIntentId(
  paymentIntent: Stripe.Checkout.Session["payment_intent"],
) {
  if (!paymentIntent) {
    return null;
  }

  if (typeof paymentIntent === "string") {
    return paymentIntent;
  }

  return paymentIntent.id;
}

function toCheckoutLineItems(lineItems: Stripe.LineItem[]): CheckoutLineItem[] {
  return lineItems.map((lineItem) => {
    const quantity = lineItem.quantity ?? 1;
    const unitPrice =
      lineItem.price?.unit_amount ??
      Math.round((lineItem.amount_total ?? 0) / quantity);
    const totalPrice = lineItem.amount_total ?? unitPrice * quantity;
    const priceProduct = lineItem.price?.product;

    let variantId: string | null = null;
    let variantTitle: string | null = null;
    let sku: string | null = null;
    let frameSnapshot: FrameSnapshot | null = null;

    if (
      priceProduct &&
      typeof priceProduct !== "string" &&
      !("deleted" in priceProduct)
    ) {
      const metadata = priceProduct.metadata ?? {};
      variantId =
        metadata.variantId && uuidPattern.test(metadata.variantId)
          ? metadata.variantId
          : null;
      variantTitle = metadata.variantTitle ?? null;
      sku = metadata.sku ?? null;

      if (metadata.frameId && uuidPattern.test(metadata.frameId)) {
        const priceDelta = Number(metadata.framePriceDelta ?? "0");
        frameSnapshot = {
          id: metadata.frameId,
          name: metadata.frameName ?? "Frame",
          imageUrl: metadata.frameImageUrl ?? null,
          priceDelta: Number.isFinite(priceDelta) ? priceDelta : 0,
        };
      }
    }

    return {
      variantId,
      productTitle: lineItem.description ?? "Product",
      variantTitle,
      sku,
      quantity,
      unitPrice,
      totalPrice,
      frameSnapshot,
    };
  });
}

async function loadCheckoutSessionWithItems(sessionId: string) {
  if (!stripe) {
    throw new Error("Stripe is not configured.");
  }

  const [session, lineItems] = await Promise.all([
    stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    }),
    stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 100,
      expand: ["data.price.product"],
    }),
  ]);

  return {
    session,
    items: toCheckoutLineItems(lineItems.data),
  };
}

async function runPaidCheckoutSideEffects(args: {
  order: StoredOrder;
  session: Stripe.Checkout.Session;
  items: CheckoutLineItem[];
  email: string;
}) {
  const { order, session, items, email } = args;

  const confirmationEmailResult = await sendOrderConfirmationEmail({
    email,
    orderNumber: order.orderNumber,
    currency: order.currency,
    subtotal: order.subtotal,
    shippingTotal: order.shippingTotal,
    taxTotal: order.taxTotal,
    discountTotal: order.discountTotal,
    grandTotal: order.grandTotal,
    createdAt: order.createdAt,
    shippingAddress: order.shippingAddress,
    items: items.map((item) => ({
      productTitle: item.productTitle,
      variantTitle: item.variantTitle,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
  });

  if (confirmationEmailResult.status === "sent") {
    await orderRepository.appendEvent(order.id, {
      eventType: "email.order_confirmation.sent",
      description: `Order confirmation email sent to ${email}.`,
      actor: "system",
      metadata: {
        provider: "resend",
        messageId: confirmationEmailResult.providerMessageId,
      },
    });
  }

  if (confirmationEmailResult.status === "failed") {
    await orderRepository.appendEvent(order.id, {
      eventType: "email.order_confirmation.failed",
      description: "Order confirmation email failed to send.",
      actor: "system",
      metadata: {
        reason: confirmationEmailResult.reason,
      },
    });
  }

  if (confirmationEmailResult.status === "skipped") {
    await orderRepository.appendEvent(order.id, {
      eventType: "email.order_confirmation.skipped",
      description: "Order confirmation email was skipped.",
      actor: "system",
      metadata: {
        reason: confirmationEmailResult.reason,
      },
    });
  }

  const discountId = session.metadata?.discountId;
  const discountCode = session.metadata?.discountCode;
  const discountSource = session.metadata?.discountSource;

  if (discountId) {
    await discountRepository.incrementUsage(discountId);

    await orderRepository.appendEvent(order.id, {
      eventType: "checkout.discount.applied",
      description:
        discountSource === "automatic"
          ? discountCode
            ? `Automatic discount ${discountCode} applied at checkout.`
            : "Automatic discount applied at checkout."
          : discountCode
            ? `Discount code ${discountCode} applied at checkout.`
            : "Discount applied at checkout.",
      actor: "stripe-webhook",
      metadata: {
        discountId,
        discountCode: discountCode ?? null,
        discountSource: discountSource ?? null,
      },
    });
  }

  const inventoryResults = await Promise.all(
    items
      .filter((item) => Boolean(item.variantId))
      .map(async (item) => ({
        variantId: item.variantId as string,
        quantity: item.quantity,
        ok: await inventoryRepository.confirm(
          item.variantId as string,
          item.quantity,
        ),
      })),
  );

  const failed = inventoryResults.filter((entry) => !entry.ok);
  if (failed.length > 0) {
    await orderRepository.appendEvent(order.id, {
      eventType: "inventory.confirmation.partial_failure",
      description:
        "One or more inventory confirmations failed after checkout completion.",
      actor: "stripe-webhook",
      metadata: {
        failed,
      },
    });
  }

  // Reservation was just confirmed by inventoryRepository.confirm above. Mark the
  // pending row completed so a stray `expired` event can never release stock
  // that has already been sold.
  await checkoutSessionRepository.markCompletedBySessionId(session.id);
}

async function handleCheckoutCompleted(checkoutSessionId: string) {
  const { session, items } =
    await loadCheckoutSessionWithItems(checkoutSessionId);

  const email = session.customer_details?.email ?? session.customer_email;
  if (!email) {
    throw new Error("Checkout session email is missing.");
  }

  const created = await orderRepository.createFromCheckoutSession({
    sessionId: session.id,
    paymentIntentId: getPaymentIntentId(session.payment_intent),
    email,
    paymentStatus: session.payment_status === "paid" ? "paid" : "pending",
    currency: (session.currency ?? "usd").toUpperCase(),
    subtotal: session.amount_subtotal ?? 0,
    taxTotal: session.total_details?.amount_tax ?? 0,
    shippingTotal: session.total_details?.amount_shipping ?? 0,
    discountTotal: session.total_details?.amount_discount ?? 0,
    grandTotal: session.amount_total ?? 0,
    shippingAddress: session.collected_information?.shipping_details ?? null,
    billingAddress: session.customer_details?.address ?? null,
    items,
  });

  if (!created.created) {
    return;
  }

  if (session.payment_status !== "paid") {
    return;
  }

  await runPaidCheckoutSideEffects({
    order: created.order,
    session,
    items,
    email,
  });
}

async function handleCheckoutAsyncPaymentSucceeded(checkoutSessionId: string) {
  const { session, items } =
    await loadCheckoutSessionWithItems(checkoutSessionId);

  const email = session.customer_details?.email ?? session.customer_email;
  if (!email) {
    throw new Error("Checkout session email is missing.");
  }

  const created = await orderRepository.createFromCheckoutSession({
    sessionId: session.id,
    paymentIntentId: getPaymentIntentId(session.payment_intent),
    email,
    paymentStatus: "paid",
    currency: (session.currency ?? "usd").toUpperCase(),
    subtotal: session.amount_subtotal ?? 0,
    taxTotal: session.total_details?.amount_tax ?? 0,
    shippingTotal: session.total_details?.amount_shipping ?? 0,
    discountTotal: session.total_details?.amount_discount ?? 0,
    grandTotal: session.amount_total ?? 0,
    shippingAddress: session.collected_information?.shipping_details ?? null,
    billingAddress: session.customer_details?.address ?? null,
    items,
  });

  if (created.created) {
    await runPaidCheckoutSideEffects({
      order: created.order,
      session,
      items,
      email,
    });
    return;
  }

  const transition = await orderRepository.markPaymentStatusByCheckoutSession(
    session.id,
    {
      paymentStatus: "paid",
      status: "confirmed",
      eventType: "checkout.session.async_payment_succeeded",
      description: "Asynchronous Stripe payment succeeded.",
      metadata: {
        paymentIntentId: getPaymentIntentId(session.payment_intent),
      },
    },
  );

  if (!transition || !transition.changed) {
    return;
  }

  await runPaidCheckoutSideEffects({
    order: transition.order,
    session,
    items,
    email,
  });
}

async function handleCheckoutAsyncPaymentFailed(checkoutSessionId: string) {
  const transition = await orderRepository.markPaymentStatusByCheckoutSession(
    checkoutSessionId,
    {
      paymentStatus: "failed",
      status: "cancelled",
      eventType: "checkout.session.async_payment_failed",
      description: "Asynchronous Stripe payment failed.",
    },
  );

  if (!transition || !transition.changed) {
    return;
  }

  // Release via the pending row (status-guarded) so we return exactly what was
  // reserved, exactly once — even if the replace path already released it.
  await checkoutSessionRepository.releaseBySessionId(checkoutSessionId);
}

async function handleCheckoutExpired(checkoutSessionId: string) {
  await orderRepository.markCheckoutExpired(checkoutSessionId);

  // Independent of order state: an expired session always releases its
  // reservation. Idempotent — a row already released/completed is a no-op.
  await checkoutSessionRepository.releaseBySessionId(checkoutSessionId);
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) {
    return;
  }

  await orderRepository.markPaymentStatusByPaymentIntent(paymentIntentId, {
    paymentStatus: "refunded",
    eventType: "charge.refunded",
    description: "A Stripe charge linked to this order was refunded.",
    metadata: {
      chargeId: charge.id,
      amountRefunded: charge.amount_refunded,
    },
  });
}

async function handleChargeDisputeCreated(dispute: Stripe.Dispute) {
  const paymentIntentId =
    typeof dispute.payment_intent === "string"
      ? dispute.payment_intent
      : dispute.payment_intent?.id;

  if (!paymentIntentId) {
    return;
  }

  await orderRepository.markPaymentStatusByPaymentIntent(paymentIntentId, {
    paymentStatus: "failed",
    eventType: "charge.dispute.created",
    description: "A Stripe dispute was created for this order.",
    metadata: {
      disputeId: dispute.id,
      disputedAmount: dispute.amount,
    },
  });
}

export async function POST(request: Request) {
  if (!stripe || !serverEnv.STRIPE_WEBHOOK_SECRET) {
    monitor.error("Stripe webhook configuration missing.", undefined, {
      route: "/api/webhooks/stripe",
      stripeConfigured: Boolean(stripe),
      webhookSecretConfigured: Boolean(serverEnv.STRIPE_WEBHOOK_SECRET),
    });

    return NextResponse.json(
      { error: "Stripe webhook configuration missing." },
      { status: 500 },
    );
  }

  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    monitor.warn("Stripe webhook rejected: missing signature.", {
      route: "/api/webhooks/stripe",
    });

    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      serverEnv.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    monitor.warn("Stripe webhook rejected: invalid signature.", {
      route: "/api/webhooks/stripe",
      error: (error as Error).message,
    });

    return NextResponse.json(
      { error: `Invalid webhook signature: ${(error as Error).message}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(
          (event.data.object as Stripe.Checkout.Session).id,
        );
        return NextResponse.json({ received: true, event: event.type });
      }
      case "checkout.session.expired": {
        await handleCheckoutExpired(
          (event.data.object as Stripe.Checkout.Session).id,
        );
        return NextResponse.json({ received: true, event: event.type });
      }
      case "checkout.session.async_payment_succeeded": {
        await handleCheckoutAsyncPaymentSucceeded(
          (event.data.object as Stripe.Checkout.Session).id,
        );
        return NextResponse.json({ received: true, event: event.type });
      }
      case "checkout.session.async_payment_failed": {
        await handleCheckoutAsyncPaymentFailed(
          (event.data.object as Stripe.Checkout.Session).id,
        );
        return NextResponse.json({ received: true, event: event.type });
      }
      case "charge.refunded": {
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        return NextResponse.json({ received: true, event: event.type });
      }
      case "charge.dispute.created": {
        await handleChargeDisputeCreated(event.data.object as Stripe.Dispute);
        return NextResponse.json({ received: true, event: event.type });
      }
      default:
        return NextResponse.json({ received: true, ignored: event.type });
    }
  } catch (error) {
    monitor.error("Stripe webhook handler failed.", error, {
      route: "/api/webhooks/stripe",
      eventType: event.type,
      eventId: event.id,
    });

    return NextResponse.json(
      { error: "Webhook handler failed." },
      { status: 500 },
    );
  }
}
