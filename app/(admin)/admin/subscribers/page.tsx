import {
  addManualSubscriber,
  sendNewsletterCampaignAction,
  updateSubscriberStatus,
} from "./actions";

import { newsletterRepository } from "@/lib/repositories/newsletter-repository";
import { formatDate } from "@/lib/utils/formatters";

type AdminSubscribersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function statusClasses(status: string) {
  if (status === "active") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "unsubscribed") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-zinc-100 text-zinc-700";
}

async function loadSubscribersPageData() {
  try {
    const [stats, subscribers] = await Promise.all([
      newsletterRepository.getAdminStats(),
      newsletterRepository.listForAdmin(250),
    ]);

    return {
      stats,
      subscribers,
    };
  } catch {
    return {
      stats: {
        total: 0,
        activeCount: 0,
        newLast30Days: 0,
      },
      subscribers: [],
    };
  }
}

function getStringParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}

export default async function AdminSubscribersPage({
  searchParams,
}: AdminSubscribersPageProps) {
  const { stats, subscribers } = await loadSubscribersPageData();
  const resolvedSearchParams = await searchParams;

  const campaignStatus = getStringParam(resolvedSearchParams, "campaign");
  const attempted = Number(
    getStringParam(resolvedSearchParams, "attempted") ?? 0,
  );
  const sent = Number(getStringParam(resolvedSearchParams, "sent") ?? 0);
  const failed = Number(getStringParam(resolvedSearchParams, "failed") ?? 0);
  const skipped = Number(getStringParam(resolvedSearchParams, "skipped") ?? 0);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-zinc-900">
          Newsletter subscribers
        </h2>
        <div className="flex items-center gap-3">
          <a
            href="/api/admin/subscribers/export"
            className="inline-flex h-9 items-center rounded border border-zinc-300 px-3 text-xs font-medium uppercase tracking-[0.06em] text-zinc-700 hover:bg-zinc-100"
          >
            Export CSV
          </a>
          <p className="text-sm text-zinc-500">Latest 250 entries</p>
        </div>
      </div>

      {campaignStatus === "sent" ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Campaign send complete. Attempted {attempted}, sent {sent}, failed{" "}
          {failed}, skipped {skipped}.
        </div>
      ) : null}

      {campaignStatus === "invalid" ? (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Subject and body are required to send a campaign.
        </div>
      ) : null}

      {campaignStatus === "invalid_cta" ? (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          CTA label and CTA URL must both be provided when using a campaign
          button.
        </div>
      ) : null}

      <div className="rounded border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-700">
          Newsletter campaign
        </h3>
        <p className="mt-1 text-sm text-zinc-600">
          Send to active subscribers only ({stats.activeCount} recipients).
        </p>

        <form action={sendNewsletterCampaignAction} className="mt-4 space-y-3">
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">
              Subject
            </span>
            <input
              type="text"
              name="subject"
              required
              className="h-10 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">
              Heading (optional)
            </span>
            <input
              type="text"
              name="heading"
              className="h-10 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">
              Body
            </span>
            <textarea
              name="body"
              required
              rows={6}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              placeholder="Write your campaign message. Use new lines to create separate paragraphs."
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">
                CTA label (optional)
              </span>
              <input
                type="text"
                name="ctaLabel"
                className="h-10 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">
                CTA URL (optional)
              </span>
              <input
                type="url"
                name="ctaUrl"
                className="h-10 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
              />
            </label>
          </div>

          <button
            type="submit"
            className="inline-flex h-10 items-center rounded bg-zinc-900 px-4 text-xs font-medium uppercase tracking-[0.06em] text-white hover:bg-zinc-700"
          >
            Send campaign to active subscribers
          </button>
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Total
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {stats.total}
          </p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Active
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {stats.activeCount}
          </p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            New (30d)
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {stats.newLast30Days}
          </p>
        </div>
      </div>

      <form
        action={addManualSubscriber}
        className="flex flex-col gap-2 rounded border border-zinc-200 bg-white p-4 sm:flex-row sm:items-end"
      >
        <label className="flex-1 space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Add subscriber manually
          </span>
          <input
            type="email"
            name="email"
            required
            placeholder="collector@example.com"
            className="h-10 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded bg-zinc-900 px-4 text-xs font-medium uppercase tracking-[0.06em] text-white hover:bg-zinc-700"
        >
          Add subscriber
        </button>
      </form>

      {subscribers.length > 0 ? (
        <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <caption className="sr-only">
              Newsletter subscribers with status, source, subscription date, and
              actions.
            </caption>
            <thead className="bg-zinc-50">
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
                <th scope="col" className="px-4 py-3">
                  Email
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  Source
                </th>
                <th scope="col" className="px-4 py-3">
                  Subscribed
                </th>
                <th scope="col" className="px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {subscribers.map((subscriber) => (
                <tr key={subscriber.id}>
                  <th
                    scope="row"
                    className="px-4 py-3 text-left font-medium text-zinc-900"
                  >
                    {subscriber.email}
                  </th>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs uppercase tracking-[0.06em] ${statusClasses(subscriber.status)}`}
                    >
                      {subscriber.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 uppercase text-zinc-600">
                    {subscriber.source}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatDate(subscriber.subscribedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <form action={updateSubscriberStatus}>
                      <input
                        type="hidden"
                        name="email"
                        value={subscriber.email}
                      />
                      <input
                        type="hidden"
                        name="status"
                        value={
                          subscriber.status === "active"
                            ? "unsubscribed"
                            : "active"
                        }
                      />
                      <button
                        type="submit"
                        className="inline-flex h-8 items-center rounded border border-zinc-300 px-3 text-xs font-medium uppercase tracking-[0.06em] text-zinc-700 hover:bg-zinc-100"
                      >
                        {subscriber.status === "active"
                          ? "Unsubscribe"
                          : "Reactivate"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          No subscribers yet. Signups from storefront forms will appear here.
        </div>
      )}
    </section>
  );
}
