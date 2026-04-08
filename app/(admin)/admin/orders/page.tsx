import Link from "next/link";

import { orderRepository } from "@/lib/repositories/order-repository";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

type OrdersPageSearchParams = {
  q?: string | string[];
  status?: string | string[];
  payment?: string | string[];
  sort?: string | string[];
};

type AdminOrdersPageProps = {
  searchParams: Promise<OrdersPageSearchParams>;
};

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function statusClasses(status: string) {
  if (status === "delivered") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "cancelled") {
    return "bg-rose-100 text-rose-700";
  }

  if (status === "processing" || status === "shipped") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-zinc-100 text-zinc-700";
}

function paymentClasses(status: string) {
  if (status === "paid") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "failed" || status === "refunded") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-amber-100 text-amber-700";
}

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  const resolvedSearchParams = await searchParams;

  const query = readSingle(resolvedSearchParams.q)?.trim() ?? "";
  const status = readSingle(resolvedSearchParams.status) ?? "all";
  const paymentStatus = readSingle(resolvedSearchParams.payment) ?? "all";
  const sort = readSingle(resolvedSearchParams.sort) ?? "newest";

  const [stats, orders] = await Promise.all([
    orderRepository.getAdminStats(),
    orderRepository.listForAdmin({
      query: query.length > 0 ? query : undefined,
      status,
      paymentStatus,
      sort:
        sort === "oldest" || sort === "total_desc" || sort === "total_asc"
          ? sort
          : "newest",
      limit: 100,
    }),
  ]);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-zinc-900">Orders</h2>
        <p className="text-sm text-zinc-500">
          Showing {orders.rows.length} of {orders.total}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Total orders
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {stats.total}
          </p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Paid orders
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {stats.paid}
          </p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Pending fulfillment
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {stats.pendingFulfillment}
          </p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Cancelled
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {stats.cancelled}
          </p>
        </div>
      </div>

      <form className="grid gap-3 rounded border border-zinc-200 bg-white p-4 md:grid-cols-5">
        <label className="space-y-1 md:col-span-2">
          <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Search
          </span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Order number or customer email"
            className="h-10 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Status
          </span>
          <select
            name="status"
            defaultValue={status}
            className="h-10 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Payment
          </span>
          <select
            name="payment"
            defaultValue={paymentStatus}
            className="h-10 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Sort
          </span>
          <select
            name="sort"
            defaultValue={sort}
            className="h-10 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="total_desc">Total high to low</option>
            <option value="total_asc">Total low to high</option>
          </select>
        </label>

        <div className="flex items-end gap-2 md:col-span-5">
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded bg-zinc-900 px-4 text-xs font-medium uppercase tracking-[0.06em] text-white hover:bg-zinc-700"
          >
            Apply filters
          </button>
          <Link
            href="/admin/orders"
            className="inline-flex h-10 items-center rounded border border-zinc-300 px-4 text-xs font-medium uppercase tracking-[0.06em] text-zinc-700 hover:bg-zinc-100"
          >
            Reset
          </Link>
        </div>
      </form>

      {orders.rows.length > 0 ? (
        <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <caption className="sr-only">
              Orders matching current filters with customer, workflow, totals,
              and created dates.
            </caption>
            <thead className="bg-zinc-50">
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
                <th scope="col" className="px-4 py-3">
                  Order
                </th>
                <th scope="col" className="px-4 py-3">
                  Customer
                </th>
                <th scope="col" className="px-4 py-3">
                  Workflow
                </th>
                <th scope="col" className="px-4 py-3">
                  Total
                </th>
                <th scope="col" className="px-4 py-3">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {orders.rows.map((order) => (
                <tr key={order.id}>
                  <th scope="row" className="px-4 py-3 text-left align-top">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium text-zinc-900 hover:text-zinc-700"
                    >
                      {order.orderNumber}
                    </Link>
                    <p className="mt-1 text-xs text-zinc-500">{order.id}</p>
                  </th>
                  <td className="px-4 py-3 align-top">
                    <a
                      href={`mailto:${order.email}`}
                      className="text-zinc-700 hover:text-zinc-900"
                    >
                      {order.email}
                    </a>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`w-fit rounded px-2 py-1 text-xs uppercase tracking-[0.06em] ${statusClasses(order.status)}`}
                      >
                        {order.status}
                      </span>
                      <span
                        className={`w-fit rounded px-2 py-1 text-xs uppercase tracking-[0.06em] ${paymentClasses(order.paymentStatus)}`}
                      >
                        {order.paymentStatus}
                      </span>
                      <span className="text-xs uppercase text-zinc-500">
                        Fulfillment: {order.fulfillmentStatus}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top font-medium text-zinc-900">
                    {formatCurrency(order.grandTotal, order.currency)}
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-600">
                    {formatDate(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          No orders match the current filters.
        </div>
      )}
    </section>
  );
}
