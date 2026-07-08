import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Icon,
  StatCard,
} from "@/components/admin/ui";
import { orderRepository } from "@/lib/repositories/order-repository";

import { OrdersTable } from "./orders-table";

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
      limit: 250,
    }),
  ]);

  const paidRate =
    stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0;
  const hasFilters =
    query.length > 0 ||
    status !== "all" ||
    paymentStatus !== "all" ||
    sort !== "newest";

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--admin-saffron)" }}
          >
            Sales
          </p>
          <h2
            className="admin-display text-2xl font-semibold"
            style={{ color: "var(--admin-text)" }}
          >
            Orders
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--admin-text-soft)" }}
          >
            Track payment, fulfillment, and delivery for every order.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span style={{ color: "var(--admin-text-mute)" }}>
              {orders.rows.length} loaded · {orders.total} total
            </span>
            {stats.pendingFulfillment > 0 ? (
              <Badge tone="warning">
                {stats.pendingFulfillment} pending fulfillment
              </Badge>
            ) : null}
          </div>
        </div>
        <ButtonLink href="/pos" className="shrink-0">
          <Icon.Plus width={14} height={14} /> New sale
        </ButtonLink>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total orders"
          value={stats.total}
          hint="all sources"
          icon={<Icon.Bag />}
          href="/admin/orders"
        />
        <StatCard
          label="Paid orders"
          value={stats.paid}
          hint={`${paidRate}% of total`}
          icon={<Icon.Cash />}
          tone="success"
          href="/admin/orders?payment=paid"
        />
        <StatCard
          label="Pending fulfillment"
          value={stats.pendingFulfillment}
          hint={stats.pendingFulfillment > 0 ? "needs action" : "all clear"}
          icon={<Icon.Box />}
          tone={stats.pendingFulfillment > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Cancelled"
          value={stats.cancelled}
          hint="excluded from revenue"
          icon={<Icon.Archive />}
          href="/admin/orders?status=cancelled"
        />
      </div>

      <Card>
        <CardHeader
          title="Filters"
          description="Narrow the list of orders."
          action={
            hasFilters ? <Badge tone="info">Filters active</Badge> : null
          }
        />
        <CardBody>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <label className="space-y-1 sm:col-span-2 lg:col-span-3 xl:col-span-2">
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--admin-text-mute)" }}
              >
                Search
              </span>
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Order number or customer email"
                className="h-9 w-full rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-(--admin-accent)"
                style={{
                  background: "var(--admin-surface)",
                  border: "1px solid var(--admin-border-strong)",
                  color: "var(--admin-text)",
                }}
              />
            </label>

            <label className="space-y-1">
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--admin-text-mute)" }}
              >
                Status
              </span>
              <select
                name="status"
                defaultValue={status}
                className="h-9 w-full rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-(--admin-accent)"
                style={{
                  background: "var(--admin-surface)",
                  border: "1px solid var(--admin-border-strong)",
                  color: "var(--admin-text)",
                }}
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
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--admin-text-mute)" }}
              >
                Payment
              </span>
              <select
                name="payment"
                defaultValue={paymentStatus}
                className="h-9 w-full rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-(--admin-accent)"
                style={{
                  background: "var(--admin-surface)",
                  border: "1px solid var(--admin-border-strong)",
                  color: "var(--admin-text)",
                }}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </label>

            <label className="space-y-1">
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--admin-text-mute)" }}
              >
                Sort
              </span>
              <select
                name="sort"
                defaultValue={sort}
                className="h-9 w-full rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-(--admin-accent)"
                style={{
                  background: "var(--admin-surface)",
                  border: "1px solid var(--admin-border-strong)",
                  color: "var(--admin-text)",
                }}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="total_desc">Total high to low</option>
                <option value="total_asc">Total low to high</option>
              </select>
            </label>

            <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-5">
              <Button type="submit" className="max-sm:flex-1">
                Apply filters
              </Button>
              <ButtonLink
                href="/admin/orders"
                variant="secondary"
                className="max-sm:flex-1"
              >
                Reset
              </ButtonLink>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="All orders"
          description="Click an order number to manage workflow and refunds."
        />
        {orders.rows.length > 0 ? (
          <OrdersTable rows={orders.rows} />
        ) : (
          <CardBody>
            <EmptyState
              icon={<Icon.Bag width={28} height={28} />}
              title={
                hasFilters ? "No orders match these filters" : "No orders yet"
              }
              description={
                hasFilters
                  ? "Try widening your search, status, or payment filters."
                  : "Orders from your storefront and point of sale will appear here."
              }
              action={
                hasFilters ? (
                  <ButtonLink
                    href="/admin/orders"
                    variant="secondary"
                    size="sm"
                  >
                    Clear filters
                  </ButtonLink>
                ) : (
                  <ButtonLink href="/pos" size="sm">
                    <Icon.Plus width={14} height={14} /> New sale
                  </ButtonLink>
                )
              }
            />
          </CardBody>
        )}
      </Card>
    </section>
  );
}
