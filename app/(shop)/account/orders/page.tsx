import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { orderRepository } from "@/lib/repositories/order-repository";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

export default async function AccountOrdersPage() {
  const session = await auth.getSession();

  if (!session.user) {
    redirect("/auth/login?next=%2Faccount%2Forders");
  }

  const rows = await orderRepository
    .listForCustomer(session, 50)
    .catch(() => []);

  return (
    <section className="container-page py-14 md:py-20">
      <h1 className="font-serif text-4xl text-ink md:text-5xl">
        Order History
      </h1>
      <p className="mt-4 max-w-2xl text-base text-ink-soft">
        Review your previous purchases and their current status.
      </p>

      {rows.length > 0 ? (
        <div className="mt-8 overflow-x-auto border border-paper-3 bg-paper">
          <table className="w-full min-w-170 text-left text-sm text-ink-soft">
            <caption className="sr-only">
              Order history including order number, date, status, payment,
              fulfillment, and total amount.
            </caption>
            <thead className="border-b border-paper-3 text-xs uppercase tracking-[0.08em] text-ink-mute">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Order
                </th>
                <th scope="col" className="px-4 py-3">
                  Date
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  Payment
                </th>
                <th scope="col" className="px-4 py-3">
                  Fulfillment
                </th>
                <th scope="col" className="px-4 py-3">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-paper-3 last:border-0"
                >
                  <th
                    scope="row"
                    className="px-4 py-3 font-medium text-ink"
                  >
                    {order.orderNumber}
                  </th>
                  <td className="px-4 py-3">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">{order.status}</td>
                  <td className="px-4 py-3">{order.paymentStatus}</td>
                  <td className="px-4 py-3">{order.fulfillmentStatus}</td>
                  <td className="px-4 py-3">
                    {formatCurrency(order.grandTotal, order.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-8 border border-paper-3 bg-paper p-6 text-sm text-ink-mute">
          <p>You have no orders yet.</p>
          <Link
            href="/products"
            className="mt-3 inline-flex text-sm font-medium text-ink-soft hover:text-ink"
          >
            Browse products
          </Link>
        </div>
      )}
    </section>
  );
}
