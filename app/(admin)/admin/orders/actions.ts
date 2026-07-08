"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { sendOrderShippedEmail } from "@/lib/email/transactional";
import { orderRepository } from "@/lib/repositories/order-repository";
import { stripe } from "@/lib/stripe/client";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

type FulfillmentStatus = "unfulfilled" | "partial" | "fulfilled" | "restocked";

type RefundReason = "duplicate" | "fraudulent" | "requested_by_customer";

function toOrderStatus(value: FormDataEntryValue | null): OrderStatus | null {
  if (
    value === "pending" ||
    value === "confirmed" ||
    value === "processing" ||
    value === "shipped" ||
    value === "delivered" ||
    value === "cancelled"
  ) {
    return value;
  }

  return null;
}

function toFulfillmentStatus(
  value: FormDataEntryValue | null,
): FulfillmentStatus | null {
  if (
    value === "unfulfilled" ||
    value === "partial" ||
    value === "fulfilled" ||
    value === "restocked"
  ) {
    return value;
  }

  return null;
}

async function assertAdmin() {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    throw new Error("Forbidden");
  }

  return session;
}

function toRefundReason(value: FormDataEntryValue | null): RefundReason | null {
  if (
    value === "duplicate" ||
    value === "fraudulent" ||
    value === "requested_by_customer"
  ) {
    return value;
  }

  return null;
}

export async function updateOrderStatusAction(formData: FormData) {
  const session = await assertAdmin();

  const id = formData.get("id");
  const status = toOrderStatus(formData.get("status"));

  if (typeof id !== "string" || !status) {
    return;
  }

  const previousOrder = await orderRepository.findByIdForAdmin(id, session);
  if (!previousOrder) {
    return;
  }

  const didUpdate = await orderRepository.updateOrderStatus(id, status);

  if (didUpdate && status === "shipped" && previousOrder.status !== "shipped") {
    const detail = await orderRepository.findDetailForAdmin(id, session);

    if (detail) {
      const emailResult = await sendOrderShippedEmail({
        email: detail.order.email,
        orderNumber: detail.order.orderNumber,
        currency: detail.order.currency,
        grandTotal: detail.order.grandTotal,
        shippedAt: new Date(),
        items: detail.items.map((item) => ({
          productTitle: item.productTitle,
          variantTitle: item.variantTitle,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      });

      if (emailResult.status === "sent") {
        await orderRepository.appendEvent(id, {
          eventType: "email.order_shipped.sent",
          description: `Shipping email sent to ${detail.order.email}.`,
          actor: "admin",
          metadata: {
            provider: "resend",
            messageId: emailResult.providerMessageId,
          },
        });
      }

      if (emailResult.status === "failed") {
        await orderRepository.appendEvent(id, {
          eventType: "email.order_shipped.failed",
          description: "Shipping email failed to send.",
          actor: "admin",
          metadata: {
            reason: emailResult.reason,
          },
        });
      }

      if (emailResult.status === "skipped") {
        await orderRepository.appendEvent(id, {
          eventType: "email.order_shipped.skipped",
          description: "Shipping email was skipped.",
          actor: "admin",
          metadata: {
            reason: emailResult.reason,
          },
        });
      }
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  redirect(`/admin/orders/${id}?status=status-updated`);
}

export async function updateFulfillmentStatusAction(formData: FormData) {
  await assertAdmin();

  const id = formData.get("id");
  const fulfillmentStatus = toFulfillmentStatus(
    formData.get("fulfillmentStatus"),
  );

  if (typeof id !== "string" || !fulfillmentStatus) {
    return;
  }

  await orderRepository.updateFulfillmentStatus(id, fulfillmentStatus);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  redirect(`/admin/orders/${id}?status=fulfillment-updated`);
}

export async function updateOrderNotesAction(formData: FormData) {
  await assertAdmin();

  const id = formData.get("id");
  const notes = formData.get("notes");

  if (typeof id !== "string") {
    return;
  }

  const normalizedNotes =
    typeof notes === "string" && notes.trim().length > 0 ? notes.trim() : null;

  await orderRepository.updateAdminNotes(id, normalizedNotes);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  redirect(`/admin/orders/${id}?status=notes-saved`);
}

export async function requestOrderRefundAction(formData: FormData) {
  const session = await assertAdmin();

  const id = formData.get("id");
  const amountInput = formData.get("amount");
  const reason = toRefundReason(formData.get("reason"));

  if (typeof id !== "string" || !stripe) {
    return;
  }

  const order = await orderRepository.findByIdForAdmin(id, session);
  if (!order?.stripePaymentIntentId) {
    return;
  }

  let amount: number | undefined;
  if (typeof amountInput === "string" && amountInput.trim().length > 0) {
    const parsedAmount = Number(amountInput.trim());
    if (!Number.isFinite(parsedAmount)) {
      return;
    }

    const amountInMinorUnits = Math.round(parsedAmount * 100);
    if (amountInMinorUnits <= 0 || amountInMinorUnits > order.grandTotal) {
      return;
    }

    amount = amountInMinorUnits;
  }

  const refund = await stripe.refunds.create({
    payment_intent: order.stripePaymentIntentId,
    amount,
    reason: reason ?? undefined,
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
    },
  });

  await orderRepository.appendEvent(order.id, {
    eventType: "admin.refund.requested",
    description: amount
      ? `Refund requested for ${amount} ${order.currency.toUpperCase()} minor units.`
      : "Full refund requested.",
    actor: "admin",
    metadata: {
      refundId: refund.id,
      refundStatus: refund.status,
      amount: refund.amount,
      reason: refund.reason,
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  redirect(`/admin/orders/${id}?status=refund-issued`);
}
