import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  Icon,
  StatCard,
} from "@/components/admin/ui";
import { newsletterRepository } from "@/lib/repositories/newsletter-repository";

import {
  addManualSubscriber,
  sendNewsletterCampaignAction,
} from "./actions";
import { SubscribersTable } from "./subscribers-table";

type AdminSubscribersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function loadSubscribersPageData() {
  try {
    const [stats, subscribers] = await Promise.all([
      newsletterRepository.getAdminStats(),
      newsletterRepository.listForAdmin(500),
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
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className="admin-display text-2xl font-semibold"
            style={{ color: "var(--admin-text)" }}
          >
            Newsletter subscribers
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--admin-text-soft)" }}
          >
            Manage opt-ins and send campaigns to your audience.
          </p>
        </div>
        <ButtonLink
          href="/api/admin/subscribers/export"
          variant="secondary"
          size="md"
        >
          <Icon.Download width={14} height={14} />
          <span>Export CSV</span>
        </ButtonLink>
      </header>

      {campaignStatus === "sent" ? (
        <div
          className="rounded-md px-4 py-3 text-sm"
          style={{
            background: "rgba(31, 122, 63, 0.08)",
            border: "1px solid rgba(31, 122, 63, 0.25)",
            color: "#1f5a36",
          }}
        >
          Campaign send complete. Attempted {attempted}, sent {sent}, failed{" "}
          {failed}, skipped {skipped}.
        </div>
      ) : null}

      {campaignStatus === "invalid" ? (
        <div
          className="rounded-md px-4 py-3 text-sm"
          style={{
            background: "rgba(201, 119, 45, 0.08)",
            border: "1px solid rgba(201, 119, 45, 0.25)",
            color: "#7a4516",
          }}
        >
          Subject and body are required to send a campaign.
        </div>
      ) : null}

      {campaignStatus === "invalid_cta" ? (
        <div
          className="rounded-md px-4 py-3 text-sm"
          style={{
            background: "rgba(201, 119, 45, 0.08)",
            border: "1px solid rgba(201, 119, 45, 0.25)",
            color: "#7a4516",
          }}
        >
          CTA label and CTA URL must both be provided when using a campaign
          button.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Active" value={stats.activeCount} />
        <StatCard label="New (30d)" value={stats.newLast30Days} />
      </div>

      <Card>
        <CardHeader
          title="Newsletter campaign"
          description={`Send to active subscribers (${stats.activeCount} recipients).`}
        />
        <CardBody>
          <form action={sendNewsletterCampaignAction} className="space-y-3">
            <label className="block space-y-1">
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--admin-text-mute)" }}
              >
                Subject
              </span>
              <input
                type="text"
                name="subject"
                required
                className="h-9 w-full rounded-md px-3 text-sm focus:outline-none focus:ring-2"
                style={{
                  background: "var(--admin-surface)",
                  border: "1px solid var(--admin-border-strong)",
                  color: "var(--admin-text)",
                }}
              />
            </label>

            <label className="block space-y-1">
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--admin-text-mute)" }}
              >
                Heading (optional)
              </span>
              <input
                type="text"
                name="heading"
                className="h-9 w-full rounded-md px-3 text-sm focus:outline-none focus:ring-2"
                style={{
                  background: "var(--admin-surface)",
                  border: "1px solid var(--admin-border-strong)",
                  color: "var(--admin-text)",
                }}
              />
            </label>

            <label className="block space-y-1">
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--admin-text-mute)" }}
              >
                Body
              </span>
              <textarea
                name="body"
                required
                rows={6}
                className="w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{
                  background: "var(--admin-surface)",
                  border: "1px solid var(--admin-border-strong)",
                  color: "var(--admin-text)",
                }}
                placeholder="Write your campaign message. Use new lines to create separate paragraphs."
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: "var(--admin-text-mute)" }}
                >
                  CTA label (optional)
                </span>
                <input
                  type="text"
                  name="ctaLabel"
                  className="h-9 w-full rounded-md px-3 text-sm focus:outline-none focus:ring-2"
                  style={{
                    background: "var(--admin-surface)",
                    border: "1px solid var(--admin-border-strong)",
                    color: "var(--admin-text)",
                  }}
                />
              </label>

              <label className="block space-y-1">
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: "var(--admin-text-mute)" }}
                >
                  CTA URL (optional)
                </span>
                <input
                  type="url"
                  name="ctaUrl"
                  className="h-9 w-full rounded-md px-3 text-sm focus:outline-none focus:ring-2"
                  style={{
                    background: "var(--admin-surface)",
                    border: "1px solid var(--admin-border-strong)",
                    color: "var(--admin-text)",
                  }}
                />
              </label>
            </div>

            <Button type="submit">
              <Icon.Megaphone width={14} height={14} />
              <span>Send campaign to active subscribers</span>
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Add subscriber"
          description="Manually add a single email."
        />
        <CardBody>
          <form
            action={addManualSubscriber}
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
          >
            <label className="flex-1 space-y-1">
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--admin-text-mute)" }}
              >
                Email
              </span>
              <input
                type="email"
                name="email"
                required
                placeholder="collector@example.com"
                className="h-9 w-full rounded-md px-3 text-sm focus:outline-none focus:ring-2"
                style={{
                  background: "var(--admin-surface)",
                  border: "1px solid var(--admin-border-strong)",
                  color: "var(--admin-text)",
                }}
              />
            </label>
            <Button type="submit">
              <Icon.Plus width={14} height={14} />
              <span>Add subscriber</span>
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="All subscribers"
          description={`${subscribers.length} entries loaded.`}
        />
        {subscribers.length > 0 ? (
          <SubscribersTable rows={subscribers} />
        ) : (
          <CardBody>
            <p
              className="text-sm"
              style={{ color: "var(--admin-text-soft)" }}
            >
              No subscribers yet. Signups from storefront forms will appear
              here.
            </p>
          </CardBody>
        )}
      </Card>
    </section>
  );
}
