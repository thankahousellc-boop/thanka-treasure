import {
  Card,
  CardBody,
  NativeSubmitButton,
  CardHeader,
  StatCard,
} from "@/components/admin/ui";
import { analyticsRepository } from "@/lib/repositories/analytics-repository";
import { formatCurrency } from "@/lib/utils/formatters";

import { TopPostsTable, TopProductsTable } from "./analytics-tables";

type AnalyticsSearchParams = {
  days?: string | string[];
};

type AdminAnalyticsPageProps = {
  searchParams: Promise<AnalyticsSearchParams>;
};

const WINDOW_OPTIONS = [7, 30, 90, 365] as const;

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseWindowDays(searchParams: AnalyticsSearchParams) {
  const rawDays = readSingle(searchParams.days);
  const parsed = Number.parseInt(rawDays ?? "30", 10);

  return WINDOW_OPTIONS.includes(parsed as (typeof WINDOW_OPTIONS)[number])
    ? parsed
    : 30;
}

async function loadAnalytics(days: number) {
  try {
    return await analyticsRepository.getOverview(days);
  } catch {
    return null;
  }
}

export default async function AdminAnalyticsPage({
  searchParams,
}: AdminAnalyticsPageProps) {
  const resolvedSearchParams = await searchParams;
  const windowDays = parseWindowDays(resolvedSearchParams);
  const analytics = await loadAnalytics(windowDays);

  if (!analytics) {
    return (
      <section className="space-y-4">
        <h2
          className="admin-display text-2xl font-semibold"
          style={{ color: "var(--admin-text)" }}
        >
          Analytics
        </h2>
        <Card>
          <CardBody>
            <p
              className="text-sm"
              style={{ color: "var(--admin-text-soft)" }}
            >
              Analytics are temporarily unavailable. Check database
              connectivity and try again.
            </p>
          </CardBody>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className="admin-display text-2xl font-semibold"
            style={{ color: "var(--admin-text)" }}
          >
            Analytics
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--admin-text-soft)" }}
          >
            Revenue, fulfillment, and content performance.
          </p>
        </div>

        <form className="flex items-center gap-2">
          <label htmlFor="analytics-window" className="sr-only">
            Analytics time window
          </label>
          <select
            id="analytics-window"
            name="days"
            defaultValue={String(analytics.windowDays)}
            className="h-9 rounded-md px-3 text-sm"
            style={{
              background: "var(--admin-surface)",
              border: "1px solid var(--admin-border-strong)",
              color: "var(--admin-text)",
            }}
          >
            {WINDOW_OPTIONS.map((days) => (
              <option key={days} value={days}>
                Last {days} days
              </option>
            ))}
          </select>
          <NativeSubmitButton pendingLabel="Applying…">Apply</NativeSubmitButton>
        </form>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Paid revenue" value={formatCurrency(analytics.revenue)} />
        <StatCard label="Paid orders" value={analytics.orderCount} />
        <StatCard
          label="Average order value"
          value={formatCurrency(analytics.averageOrderValue)}
        />
        <StatCard label="Published posts" value={analytics.publishedPostCount} />
        <StatCard label="Contact messages" value={analytics.messageCount} />
        <StatCard
          label="Active subscribers"
          value={analytics.activeSubscriberCount}
        />
      </div>

      <StatCard
        label="Low-stock variants"
        value={analytics.lowStockVariantCount}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Checkout to paid"
          value={formatPercent(analytics.conversion.checkoutToPaidRate)}
          hint={`${analytics.conversion.paidOrderCount} of ${analytics.conversion.totalOrderCount} orders`}
        />
        <StatCard
          label="Paid to fulfilled"
          value={formatPercent(analytics.conversion.paidToFulfilledRate)}
          hint="Fulfillment progression from paid orders"
        />
        <StatCard
          label="Paid to delivered"
          value={formatPercent(analytics.conversion.paidToDeliveredRate)}
          hint="Delivered completion from paid orders"
        />
        <StatCard
          label="Paid to refunded"
          value={formatPercent(analytics.conversion.paidToRefundedRate)}
          hint="Refund impact on paid orders"
        />
      </div>

      <Card>
        <CardHeader
          title="Top products"
          description="By paid revenue in the selected window."
        />
        <TopProductsTable rows={analytics.topProducts} />
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          label="Total blog views"
          value={analytics.blog.totalViews.toLocaleString("en-US")}
        />
        <StatCard
          label="Avg views per post"
          value={analytics.blog.averageViewsPerPost.toLocaleString("en-US", {
            maximumFractionDigits: 1,
            minimumFractionDigits: 1,
          })}
        />
        <StatCard
          label="Posts published in window"
          value={analytics.blog.publishedInWindowCount}
        />
      </div>

      <Card>
        <CardHeader
          title="Popular blog posts"
          description="Ranked by total views."
        />
        <TopPostsTable rows={analytics.blog.topPosts} />
      </Card>
    </section>
  );
}
