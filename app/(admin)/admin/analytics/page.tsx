import { analyticsRepository } from "@/lib/repositories/analytics-repository";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

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
        <h2 className="text-2xl font-semibold text-zinc-900">Analytics</h2>
        <div className="rounded border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          Analytics are temporarily unavailable. Check database connectivity and
          try again.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-zinc-900">Analytics</h2>

        <form className="flex items-center gap-2">
          <label htmlFor="analytics-window" className="sr-only">
            Analytics time window
          </label>
          <select
            id="analytics-window"
            name="days"
            defaultValue={String(analytics.windowDays)}
            className="h-10 rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
          >
            {WINDOW_OPTIONS.map((days) => (
              <option key={days} value={days}>
                Last {days} days
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Apply
          </button>
        </form>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Paid revenue
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {formatCurrency(analytics.revenue)}
          </p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Paid orders
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {analytics.orderCount}
          </p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            AOV
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {formatCurrency(analytics.averageOrderValue)}
          </p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Published posts
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {analytics.publishedPostCount}
          </p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Contact messages
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {analytics.messageCount}
          </p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Active subscribers
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {analytics.activeSubscriberCount}
          </p>
        </div>
      </div>

      <div className="rounded border border-zinc-200 bg-white p-4">
        <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
          Low-stock variants
        </p>
        <p className="mt-2 text-2xl font-semibold text-zinc-900">
          {analytics.lowStockVariantCount}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Checkout to paid
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {formatPercent(analytics.conversion.checkoutToPaidRate)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {analytics.conversion.paidOrderCount} of{" "}
            {analytics.conversion.totalOrderCount} orders
          </p>
        </div>

        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Paid to fulfilled
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {formatPercent(analytics.conversion.paidToFulfilledRate)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Fulfillment progression from paid orders
          </p>
        </div>

        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Paid to delivered
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {formatPercent(analytics.conversion.paidToDeliveredRate)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Delivered completion from paid orders
          </p>
        </div>

        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Paid to refunded
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {formatPercent(analytics.conversion.paidToRefundedRate)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Refund impact on paid orders
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <caption className="sr-only">
            Top products by paid revenue and units sold in the selected window
          </caption>
          <thead className="bg-zinc-50">
            <tr className="text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
              <th scope="col" className="px-4 py-3">
                Top products
              </th>
              <th scope="col" className="px-4 py-3">
                Units sold
              </th>
              <th scope="col" className="px-4 py-3">
                Revenue
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-zinc-700">
            {analytics.topProducts.length > 0 ? (
              analytics.topProducts.map((row) => (
                <tr key={row.title}>
                  <th
                    scope="row"
                    className="px-4 py-3 text-left font-medium text-zinc-900"
                  >
                    {row.title}
                  </th>
                  <td className="px-4 py-3">{row.quantitySold}</td>
                  <td className="px-4 py-3">{formatCurrency(row.revenue)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-5 text-zinc-600" colSpan={3}>
                  No paid order activity yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Total blog views
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {analytics.blog.totalViews.toLocaleString("en-US")}
          </p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Avg views per post
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {analytics.blog.averageViewsPerPost.toLocaleString("en-US", {
              maximumFractionDigits: 1,
              minimumFractionDigits: 1,
            })}
          </p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Posts published in window
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {analytics.blog.publishedInWindowCount}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <caption className="sr-only">
            Popular blog posts ranked by total views
          </caption>
          <thead className="bg-zinc-50">
            <tr className="text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
              <th scope="col" className="px-4 py-3">
                Popular blog posts
              </th>
              <th scope="col" className="px-4 py-3">
                Published
              </th>
              <th scope="col" className="px-4 py-3">
                Views
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-zinc-700">
            {analytics.blog.topPosts.length > 0 ? (
              analytics.blog.topPosts.map((post) => (
                <tr key={post.slug}>
                  <th
                    scope="row"
                    className="px-4 py-3 text-left font-medium text-zinc-900"
                  >
                    <div>{post.title}</div>
                    <div className="text-xs text-zinc-500">/{post.slug}</div>
                  </th>
                  <td className="px-4 py-3">
                    {post.publishedAt ? formatDate(post.publishedAt) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {post.viewCount.toLocaleString("en-US")}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-5 text-zinc-600" colSpan={3}>
                  No published blog analytics yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
