import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { RevenueSpark } from "@/components/admin/revenue-spark";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Icon,
  PageHeader,
  StatCard,
} from "@/components/admin/ui";
import { auth } from "@/lib/auth";
import { adminDashboardRepository } from "@/lib/repositories/admin-dashboard-repository";
import { formatCurrency } from "@/lib/utils/formatters";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;

const EMPTY_KPIS = {
  revenueCents: 0,
  paidOrderCount: 0,
  averageOrderValueCents: 0,
  newCustomerOrderCount: 0,
  revenueDeltaPercent: null,
};

const EMPTY_BADGES = {
  ordersToFulfill: 0,
  messages: 0,
  subscribers: 0,
  lowStock: 0,
};

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.error("[admin/dashboard] query failed", error);
    return fallback;
  }
}

export default async function AdminDashboardPage() {
  const session = await auth.getSession();
  const greetingName = session.user?.email?.split("@")[0] ?? "admin";

  const [kpis, badges, fulfill, lowStock, activity, trend, topProducts] =
    await Promise.all([
      safe(adminDashboardRepository.getKpis(WINDOW_DAYS), EMPTY_KPIS),
      safe(adminDashboardRepository.getBadges(), EMPTY_BADGES),
      safe(adminDashboardRepository.getOrdersToFulfill(6), []),
      safe(adminDashboardRepository.getLowStock(6), []),
      safe(adminDashboardRepository.getRecentActivity(8), []),
      safe(adminDashboardRepository.getRevenueTrend(WINDOW_DAYS), []),
      safe(adminDashboardRepository.getTopProducts(WINDOW_DAYS, 5), []),
    ]);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${greetingName}`}
        description={`Here's what's happened across your store in the last ${WINDOW_DAYS} days.`}
        actions={
          <>
            <ButtonLink
              href="/admin/products/new"
              variant="secondary"
              size="sm"
            >
              <Icon.Plus width={14} height={14} /> New product
            </ButtonLink>
            <ButtonLink href="/admin/discounts/new" size="sm">
              <Icon.Discount width={14} height={14} /> New discount
            </ButtonLink>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatCurrency(kpis.revenueCents)}
          hint={`vs previous ${WINDOW_DAYS}d`}
          trend={
            kpis.revenueDeltaPercent !== null
              ? {
                  value: Math.abs(kpis.revenueDeltaPercent),
                  direction: kpis.revenueDeltaPercent < 0 ? "down" : "up",
                }
              : undefined
          }
          icon={<Icon.Chart />}
          href="/admin/analytics"
        />
        <StatCard
          label="Paid orders"
          value={kpis.paidOrderCount.toLocaleString()}
          hint={`${badges.ordersToFulfill} need fulfilment`}
          icon={<Icon.Bag />}
          href="/admin/orders"
        />
        <StatCard
          label="Average order value"
          value={formatCurrency(kpis.averageOrderValueCents)}
          icon={<Icon.Tag />}
        />
        <StatCard
          label="Customers ordered"
          value={kpis.newCustomerOrderCount.toLocaleString()}
          hint={`${badges.subscribers} subscribers`}
          icon={<Icon.Users />}
          href="/admin/customers"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Revenue trend"
            description={`Daily paid revenue · last ${WINDOW_DAYS} days`}
            action={
              <Link
                href="/admin/analytics"
                className="text-xs font-medium text-zinc-700 hover:text-zinc-900"
              >
                View analytics →
              </Link>
            }
          />
          <CardBody>
            <RevenueSpark points={trend} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Top products"
            description="By paid revenue"
          />
          <CardBody>
            {topProducts.length === 0 ? (
              <EmptyState
                title="No sales in this window."
                description="When orders come in, your bestsellers will appear here."
              />
            ) : (
              <ol className="space-y-2.5">
                {topProducts.map((row, index) => (
                  <li
                    key={`${row.title}-${index}`}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-700">
                        {index + 1}
                      </span>
                      <span className="truncate text-zinc-800">{row.title}</span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-zinc-600">
                      {formatCurrency(Number(row.revenue))}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Orders to fulfil"
            description="Paid · awaiting fulfilment"
            action={
              fulfill.length > 0 ? (
                <Badge tone="warning">{badges.ordersToFulfill}</Badge>
              ) : null
            }
          />
          <CardBody>
            {fulfill.length === 0 ? (
              <EmptyState
                title="All caught up."
                description="No paid orders are waiting on you."
              />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {fulfill.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/orders/${row.id}`}
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        {row.orderNumber}
                      </Link>
                      <p className="truncate text-xs text-zinc-500">
                        {row.email}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium text-zinc-800">
                        {formatCurrency(row.grandTotal, row.currency)}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {formatDistanceToNow(row.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Low stock"
            description="At or below threshold"
            action={
              lowStock.length > 0 ? (
                <Badge tone="danger">{badges.lowStock}</Badge>
              ) : null
            }
          />
          <CardBody>
            {lowStock.length === 0 ? (
              <EmptyState
                title="Inventory looks healthy."
                description="No variants are currently below their low-stock threshold."
              />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {lowStock.map((row) => (
                  <li
                    key={row.variantId}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <Link
                        href={
                          row.productId
                            ? `/admin/products/${row.productId}`
                            : "/admin/products/inventory"
                        }
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        {row.variantTitle || row.productTitle}
                      </Link>
                      <p className="text-xs text-zinc-500">
                        {Number(row.available)} available · threshold {row.threshold}
                      </p>
                    </div>
                    <Badge
                      tone={Number(row.available) <= 0 ? "danger" : "warning"}
                    >
                      {Number(row.available) <= 0 ? "Out" : "Low"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent activity"
            description="Latest order events"
          />
          <CardBody>
            {activity.length === 0 ? (
              <EmptyState
                title="Quiet so far."
                description="Order events will show up here as they happen."
              />
            ) : (
              <ul className="space-y-3">
                {activity.map((row) => (
                  <li key={row.id} className="flex items-start gap-3 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-zinc-800">{row.description}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        <Link
                          href={`/admin/orders/${row.orderId}`}
                          className="hover:underline"
                        >
                          {row.orderNumber}
                        </Link>
                        {" · "}
                        {formatDistanceToNow(row.createdAt, { addSuffix: true })}
                        {row.actor ? ` · ${row.actor}` : null}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Quick actions" />
          <CardBody>
            <div className="grid gap-2">
              <ButtonLink href="/admin/products/new" variant="secondary" size="sm">
                <Icon.Plus width={14} height={14} /> New product
              </ButtonLink>
              <ButtonLink href="/admin/frames" variant="secondary" size="sm">
                <Icon.Frame width={14} height={14} /> Manage frames
              </ButtonLink>
              <ButtonLink href="/admin/discounts/new" variant="secondary" size="sm">
                <Icon.Discount width={14} height={14} /> New discount
              </ButtonLink>
              <ButtonLink href="/admin/blog/new" variant="secondary" size="sm">
                <Icon.Doc width={14} height={14} /> New blog post
              </ButtonLink>
              <ButtonLink href="/admin/settings/branding" variant="secondary" size="sm">
                <Icon.Brush width={14} height={14} /> Brand & theme
              </ButtonLink>
            </div>
          </CardBody>
        </Card>
      </section>
    </>
  );
}
