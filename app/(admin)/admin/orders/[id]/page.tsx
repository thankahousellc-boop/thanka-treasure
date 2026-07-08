import { notFound } from "next/navigation";

import {
  requestOrderRefundAction,
  updateFulfillmentStatusAction,
  updateOrderNotesAction,
  updateOrderStatusAction,
} from "../actions";

import { FlashToast } from "@/components/admin/flash-toast";
import { ButtonLink, SubmitButton } from "@/components/admin/ui";
import { auth } from "@/lib/auth";
import { orderRepository } from "@/lib/repositories/order-repository";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

type AdminOrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

function statusClasses(status: string) {
  if (status === "delivered") {
    return "bg-(--admin-success)/15 text-(--admin-success)";
  }

  if (status === "cancelled") {
    return "bg-(--admin-danger)/15 text-(--admin-danger)";
  }

  if (status === "processing" || status === "shipped") {
    return "bg-(--admin-info)/15 text-(--admin-info)";
  }

  return "bg-(--admin-surface-2) text-(--admin-text-soft)";
}

function paymentClasses(status: string) {
  if (status === "paid") {
    return "bg-(--admin-success)/15 text-(--admin-success)";
  }

  if (status === "failed" || status === "refunded") {
    return "bg-(--admin-danger)/15 text-(--admin-danger)";
  }

  return "bg-(--admin-warning)/15 text-(--admin-warning)";
}

function formatAddress(address: unknown) {
  if (!address || typeof address !== "object") {
    return "Not provided";
  }

  const record = address as Record<string, unknown>;
  const directParts = [
    record.name,
    record.line1,
    record.line2,
    record.city,
    record.state,
    record.postal_code,
    record.country,
  ]
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    )
    .map((value) => value.trim());

  if (directParts.length > 0) {
    return directParts.join(", ");
  }

  return JSON.stringify(address);
}

export default async function AdminOrderDetailPage({
  params,
}: AdminOrderDetailPageProps) {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    notFound();
  }

  const { id } = await params;
  const detail = await orderRepository.findDetailForAdmin(id, session);

  if (!detail) {
    notFound();
  }

  const { order, customer, items, events } = detail;

  return (
    <section className="space-y-5">
      <FlashToast
        messages={{
          "status-updated": "Order status updated.",
          "fulfillment-updated": "Fulfillment status updated.",
          "notes-saved": "Notes saved.",
          "refund-issued": "Refund requested.",
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
            Order detail
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-(--admin-text)">
            {order.orderNumber}
          </h2>
          <p className="mt-1 text-sm text-(--admin-text-mute)">
            Created {formatDate(order.createdAt)}
          </p>
        </div>
        <ButtonLink href="/admin/orders" variant="secondary" size="sm">
          Back to orders
        </ButtonLink>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded border border-(--admin-border) bg-(--admin-surface) p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
            Order status
          </p>
          <span
            className={`mt-2 inline-flex rounded px-2 py-1 text-xs uppercase tracking-[0.06em] ${statusClasses(order.status)}`}
          >
            {order.status}
          </span>
        </div>
        <div className="rounded border border-(--admin-border) bg-(--admin-surface) p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
            Payment status
          </p>
          <span
            className={`mt-2 inline-flex rounded px-2 py-1 text-xs uppercase tracking-[0.06em] ${paymentClasses(order.paymentStatus)}`}
          >
            {order.paymentStatus}
          </span>
        </div>
        <div className="rounded border border-(--admin-border) bg-(--admin-surface) p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
            Grand total
          </p>
          <p className="mt-2 text-2xl font-semibold text-(--admin-text)">
            {formatCurrency(order.grandTotal, order.currency)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="rounded border border-(--admin-border) bg-(--admin-surface) p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-(--admin-text-soft)">
              Customer and addresses
            </h3>
            <div className="mt-3 grid gap-3 text-sm text-(--admin-text-soft) md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
                  Customer
                </p>
                <p className="font-medium text-(--admin-text)">
                  {customer?.firstName || customer?.lastName
                    ? `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim()
                    : "Guest checkout"}
                </p>
                <p>{order.email}</p>
                {customer?.phone ? <p>{customer.phone}</p> : null}
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
                  Shipping address
                </p>
                <p>{formatAddress(order.shippingAddress)}</p>
                <p className="pt-2 text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
                  Billing address
                </p>
                <p>{formatAddress(order.billingAddress)}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded border border-(--admin-border) bg-(--admin-surface)">
            <table className="min-w-full divide-y divide-(--admin-border) text-sm">
              <caption className="sr-only">
                Order line items with quantities, unit prices, and line totals.
              </caption>
              <thead className="bg-(--admin-surface-2)">
                <tr className="text-left text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
                  <th scope="col" className="px-4 py-3">
                    Item
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Quantity
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Unit price
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Line total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--admin-border) text-(--admin-text-soft)">
                {items.length > 0 ? (
                  items.map((item) => (
                    <tr key={item.id}>
                      <th scope="row" className="px-4 py-3 text-left">
                        <p className="font-medium text-(--admin-text)">
                          {item.productTitle}
                        </p>
                        {item.variantTitle ? (
                          <p className="text-xs text-(--admin-text-mute)">
                            {item.variantTitle}
                          </p>
                        ) : null}
                        {item.sku ? (
                          <p className="text-xs uppercase tracking-[0.06em] text-(--admin-text-mute)">
                            SKU {item.sku}
                          </p>
                        ) : null}
                      </th>
                      <td className="px-4 py-3">{item.quantity}</td>
                      <td className="px-4 py-3">
                        {formatCurrency(item.unitPrice, order.currency)}
                      </td>
                      <td className="px-4 py-3 font-medium text-(--admin-text)">
                        {formatCurrency(item.totalPrice, order.currency)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-5 text-(--admin-text-soft)" colSpan={4}>
                      No order line items were stored for this order.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded border border-(--admin-border) bg-(--admin-surface) p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-(--admin-text-soft)">
              Timeline
            </h3>
            <div className="mt-3 space-y-3">
              {events.length > 0 ? (
                events.map((event) => (
                  <article
                    key={event.id}
                    className="rounded border border-(--admin-border) bg-(--admin-surface-2) p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-[0.06em] text-(--admin-text-soft)">
                        {event.eventType}
                      </p>
                      <p className="text-xs text-(--admin-text-mute)">
                        {new Date(event.createdAt).toLocaleString("en-US")}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-(--admin-text-soft)">
                      {event.description}
                    </p>
                    {event.actor ? (
                      <p className="mt-1 text-xs uppercase tracking-[0.06em] text-(--admin-text-mute)">
                        Actor: {event.actor}
                      </p>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="text-sm text-(--admin-text-soft)">No timeline events yet.</p>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <form
            action={updateOrderStatusAction}
            className="space-y-2 rounded border border-(--admin-border) bg-(--admin-surface) p-4"
          >
            <input type="hidden" name="id" value={order.id} />
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
                Order status
              </span>
              <select
                name="status"
                defaultValue={order.status}
                className="h-10 w-full rounded border border-(--admin-border-strong) bg-(--admin-surface) px-3 text-sm text-(--admin-text)"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <SubmitButton size="sm" pendingLabel="Updating…">
              Update status
            </SubmitButton>
          </form>

          <form
            action={updateFulfillmentStatusAction}
            className="space-y-2 rounded border border-(--admin-border) bg-(--admin-surface) p-4"
          >
            <input type="hidden" name="id" value={order.id} />
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
                Fulfillment status
              </span>
              <select
                name="fulfillmentStatus"
                defaultValue={order.fulfillmentStatus}
                className="h-10 w-full rounded border border-(--admin-border-strong) bg-(--admin-surface) px-3 text-sm text-(--admin-text)"
              >
                <option value="unfulfilled">Unfulfilled</option>
                <option value="partial">Partial</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="restocked">Restocked</option>
              </select>
            </label>
            <SubmitButton size="sm" variant="secondary" pendingLabel="Updating…">
              Update fulfillment
            </SubmitButton>
          </form>

          <form
            action={updateOrderNotesAction}
            className="space-y-2 rounded border border-(--admin-border) bg-(--admin-surface) p-4"
          >
            <input type="hidden" name="id" value={order.id} />
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
                Internal notes
              </span>
              <textarea
                name="notes"
                defaultValue={order.notes ?? ""}
                rows={6}
                className="w-full rounded border border-(--admin-border-strong) bg-(--admin-surface) px-3 py-2 text-sm text-(--admin-text)"
                placeholder="Internal order notes visible to admins only"
              />
            </label>
            <SubmitButton size="sm" variant="secondary">
              Save notes
            </SubmitButton>
          </form>

          <form
            action={requestOrderRefundAction}
            className="space-y-2 rounded border border-(--admin-border) bg-(--admin-surface) p-4"
          >
            <input type="hidden" name="id" value={order.id} />
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
                Refund processing
              </p>
              <p className="mt-1 text-sm text-(--admin-text-soft)">
                Submit full or partial refunds to Stripe for this payment.
              </p>
            </div>

            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
                Refund amount (optional)
              </span>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={(order.grandTotal / 100).toFixed(2)}
                placeholder={(order.grandTotal / 100).toFixed(2)}
                className="h-10 w-full rounded border border-(--admin-border-strong) bg-(--admin-surface) px-3 text-sm text-(--admin-text)"
                disabled={
                  !order.stripePaymentIntentId || order.paymentStatus !== "paid"
                }
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
                Reason
              </span>
              <select
                name="reason"
                defaultValue="requested_by_customer"
                className="h-10 w-full rounded border border-(--admin-border-strong) bg-(--admin-surface) px-3 text-sm text-(--admin-text)"
                disabled={
                  !order.stripePaymentIntentId || order.paymentStatus !== "paid"
                }
              >
                <option value="requested_by_customer">
                  Requested by customer
                </option>
                <option value="duplicate">Duplicate</option>
                <option value="fraudulent">Fraudulent</option>
              </select>
            </label>

            <SubmitButton
              size="sm"
              variant="danger"
              pendingLabel="Processing…"
              disabled={
                !order.stripePaymentIntentId || order.paymentStatus !== "paid"
              }
              className="disabled:cursor-not-allowed disabled:opacity-50"
            >
              Request refund
            </SubmitButton>

            {!order.stripePaymentIntentId ? (
              <p className="text-xs text-(--admin-text-mute)">
                Stripe payment intent is unavailable for this order.
              </p>
            ) : null}
            {order.paymentStatus !== "paid" ? (
              <p className="text-xs text-(--admin-text-mute)">
                Refund requests are enabled when payment status is paid.
              </p>
            ) : null}
            <p className="text-xs text-(--admin-text-mute)">
              Leave amount empty to request a full refund (
              {formatCurrency(order.grandTotal, order.currency)}).
            </p>
          </form>
        </aside>
      </div>
    </section>
  );
}
