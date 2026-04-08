import type { ReactElement } from "react";

import { OrderConfirmationEmail } from "@/components/emails/order-confirmation-email";
import { OrderShippedEmail } from "@/components/emails/order-shipped-email";
import { resend, resendFromEmail } from "@/lib/email/client";
import { publicEnv } from "@/lib/env";
import { formatDate } from "@/lib/utils/formatters";

type TransactionalOrderItem = {
  productTitle: string;
  variantTitle: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type BaseOrderEmailPayload = {
  email: string;
  orderNumber: string;
  currency: string;
  grandTotal: number;
  items: TransactionalOrderItem[];
};

type OrderConfirmationPayload = BaseOrderEmailPayload & {
  createdAt: Date;
  shippingAddress: unknown;
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  discountTotal: number;
};

type OrderShippedPayload = BaseOrderEmailPayload & {
  shippedAt: Date;
};

type DispatchResult = {
  status: "sent" | "skipped" | "failed";
  providerMessageId: string | null;
  reason: string | null;
};

function normalizeCurrency(input: string) {
  return input.trim().toUpperCase();
}

function formatAddress(address: unknown) {
  if (!address || typeof address !== "object") {
    return null;
  }

  const record = address as Record<string, unknown>;
  const parts = [
    record.name,
    record.line1,
    record.line2,
    record.city,
    record.state,
    record.postal_code,
    record.country,
  ]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return parts.length > 0 ? parts.join(", ") : null;
}

function resolveOrderUrl() {
  if (!publicEnv.NEXT_PUBLIC_APP_URL) {
    return null;
  }

  const baseUrl = publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return `${baseUrl}/account/orders`;
}

async function dispatchTransactionalEmail(input: {
  to: string;
  subject: string;
  react: ReactElement;
}): Promise<DispatchResult> {
  if (!resend) {
    return {
      status: "skipped",
      providerMessageId: null,
      reason: "RESEND_API_KEY is not configured.",
    };
  }

  try {
    const response = await resend.emails.send({
      from: resendFromEmail,
      to: [input.to],
      subject: input.subject,
      react: input.react,
    });

    if (response.error) {
      return {
        status: "failed",
        providerMessageId: null,
        reason: response.error.message,
      };
    }

    return {
      status: "sent",
      providerMessageId: response.data?.id ?? null,
      reason: null,
    };
  } catch (error) {
    return {
      status: "failed",
      providerMessageId: null,
      reason: (error as Error).message,
    };
  }
}

export async function sendOrderConfirmationEmail(
  payload: OrderConfirmationPayload,
) {
  const orderUrl = resolveOrderUrl();
  const currency = normalizeCurrency(payload.currency);

  return dispatchTransactionalEmail({
    to: payload.email,
    subject: `Order confirmation ${payload.orderNumber}`,
    react: (
      <OrderConfirmationEmail
        shopName="Tibetan Thanka Treasure"
        orderNumber={payload.orderNumber}
        orderDate={formatDate(payload.createdAt)}
        currency={currency}
        shippingAddress={formatAddress(payload.shippingAddress)}
        orderUrl={orderUrl}
        items={payload.items}
        subtotal={payload.subtotal}
        shippingTotal={payload.shippingTotal}
        taxTotal={payload.taxTotal}
        discountTotal={payload.discountTotal}
        grandTotal={payload.grandTotal}
      />
    ),
  });
}

export async function sendOrderShippedEmail(payload: OrderShippedPayload) {
  const orderUrl = resolveOrderUrl();
  const currency = normalizeCurrency(payload.currency);

  return dispatchTransactionalEmail({
    to: payload.email,
    subject: `Your order ${payload.orderNumber} has shipped`,
    react: (
      <OrderShippedEmail
        shopName="Tibetan Thanka Treasure"
        orderNumber={payload.orderNumber}
        currency={currency}
        grandTotal={payload.grandTotal}
        shippedAt={formatDate(payload.shippedAt)}
        orderUrl={orderUrl}
        items={payload.items}
      />
    ),
  });
}
