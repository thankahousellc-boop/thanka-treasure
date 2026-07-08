import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Icon,
  PageHeader,
  StatCard,
  SubmitButton,
} from "@/components/admin/ui";
import { FlashToast } from "@/components/admin/flash-toast";
import { contactRepository } from "@/lib/repositories/contact-repository";
import { formatDate } from "@/lib/utils/formatters";

import {
  updateContactSubmissionNotes,
  updateContactSubmissionStatus,
} from "./actions";
import { StatusSubmitButton } from "./status-submit-button";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = ["all", "new", "read", "replied", "archived"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];
type SubmissionStatus = "new" | "read" | "replied" | "archived";

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  new: "New",
  read: "Read",
  replied: "Replied",
  archived: "Archived",
};

const STATUS_TONE: Record<
  SubmissionStatus,
  "info" | "warning" | "success" | "muted"
> = {
  new: "info",
  read: "warning",
  replied: "success",
  archived: "muted",
};

function isStatusFilter(value: string | undefined): value is StatusFilter {
  return STATUS_FILTERS.includes(value as StatusFilter);
}

function readSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  return initials || "?";
}

function buildHref(status: StatusFilter, query: string) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (query) params.set("q", query);
  const qs = params.toString();
  return qs ? `/admin/messages?${qs}` : "/admin/messages";
}

type SearchParams = {
  status?: string | string[];
  q?: string | string[];
};

async function loadData() {
  try {
    const [stats, submissions] = await Promise.all([
      contactRepository.getAdminStats(),
      contactRepository.listForAdmin(100),
    ]);
    return { stats, submissions };
  } catch {
    return {
      stats: { total: 0, newCount: 0, repliedCount: 0 },
      submissions: [],
    };
  }
}

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolved = await searchParams;
  const statusParam = readSingle(resolved.status);
  const status: StatusFilter = isStatusFilter(statusParam)
    ? statusParam
    : "all";
  const queryRaw = readSingle(resolved.q)?.trim() ?? "";
  const query = queryRaw.toLowerCase();

  const { stats, submissions } = await loadData();

  const counts: Record<StatusFilter, number> = {
    all: submissions.length,
    new: submissions.filter((s) => s.status === "new").length,
    read: submissions.filter((s) => s.status === "read").length,
    replied: submissions.filter((s) => s.status === "replied").length,
    archived: submissions.filter((s) => s.status === "archived").length,
  };

  const filtered = submissions.filter((s) => {
    if (status !== "all" && s.status !== status) return false;
    if (query.length > 0) {
      const haystack =
        `${s.name} ${s.email} ${s.phone ?? ""} ${s.message}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const filtersActive = status !== "all" || queryRaw.length > 0;

  return (
    <>
      <FlashToast
        param="flash"
        messages={{
          "message-updated": "Message status updated.",
          "notes-saved": "Notes saved.",
        }}
      />
      <PageHeader
        eyebrow="Inbox"
        title="Customer messages"
        description="Replies and inquiries from the contact form. Triage, take notes, and follow up by email."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total received"
          value={stats.total}
          icon={<Icon.Mail />}
          hint="lifetime submissions"
        />
        <StatCard
          label="Awaiting reply"
          value={stats.newCount}
          icon={<Icon.Bell />}
          hint="status: new"
        />
        <StatCard
          label="Replied"
          value={stats.repliedCount}
          icon={<Icon.Check />}
          hint="resolved"
        />
        <StatCard
          label="Archived"
          value={counts.archived}
          icon={<Icon.Archive />}
          hint="hidden by default"
        />
      </section>

      <Card>
        <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <nav className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((s) => {
              const active = s === status;
              const label = s === "all" ? "All" : STATUS_LABEL[s];
              return (
                <Link
                  key={s}
                  href={buildHref(s, queryRaw)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition"
                  style={
                    active
                      ? {
                          backgroundColor: "var(--admin-accent)",
                          color: "var(--admin-on-accent)",
                        }
                      : {
                          backgroundColor: "var(--admin-surface)",
                          color: "var(--admin-text-soft)",
                          border: "1px solid var(--admin-border)",
                        }
                  }
                >
                  {label}
                  <span
                    className="rounded-full px-1.5 text-[10px] font-semibold"
                    style={
                      active
                        ? {
                            backgroundColor:
                              "color-mix(in srgb, var(--admin-on-accent) 22%, transparent)",
                            color: "var(--admin-on-accent)",
                          }
                        : {
                            backgroundColor: "var(--admin-surface-2)",
                            color: "var(--admin-text-mute)",
                          }
                    }
                  >
                    {counts[s]}
                  </span>
                </Link>
              );
            })}
          </nav>

          <form
            action="/admin/messages"
            className="flex items-center gap-2"
            role="search"
          >
            {status !== "all" ? (
              <input type="hidden" name="status" value={status} />
            ) : null}
            <label
              className="flex h-9 items-center gap-2 rounded-md px-3"
              style={{
                backgroundColor: "var(--admin-surface)",
                border: "1px solid var(--admin-border-strong)",
                color: "var(--admin-text-mute)",
              }}
            >
              <Icon.Search width={14} height={14} />
              <span className="sr-only">Search messages</span>
              <input
                type="search"
                name="q"
                defaultValue={queryRaw}
                placeholder="Search name, email, message…"
                className="h-full w-56 bg-transparent text-sm focus:outline-none"
                style={{ color: "var(--admin-text)" }}
              />
            </label>
            <Button type="submit" size="sm" variant="secondary">
              Search
            </Button>
            {filtersActive ? (
              <ButtonLink
                href="/admin/messages"
                size="sm"
                variant="ghost"
              >
                Reset
              </ButtonLink>
            ) : null}
          </form>
        </div>
      </Card>

      {filtered.length > 0 ? (
        <ul className="space-y-3">
          {filtered.map((submission) => {
            const initials = getInitials(submission.name);
            const currentStatus = submission.status as SubmissionStatus;
            const tone = STATUS_TONE[currentStatus] ?? "muted";
            const otherStatuses = (
              ["new", "read", "replied", "archived"] as const
            ).filter((s) => s !== currentStatus);
            const notesId = `note-${submission.id}`;
            const replySubject = encodeURIComponent(
              `Re: your message to Thanka Treasure`,
            );
            const replyBody = encodeURIComponent(
              `\n\n--- On ${formatDate(submission.createdAt)} you wrote: ---\n${submission.message}`,
            );

            return (
              <li key={submission.id}>
                <Card>
                  <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <div className="min-w-0 space-y-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                          style={{
                            backgroundColor: "var(--admin-surface-2)",
                            color: "var(--admin-text-soft)",
                            border: "1px solid var(--admin-border)",
                          }}
                          aria-hidden
                        >
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className="text-sm font-semibold"
                              style={{ color: "var(--admin-text)" }}
                            >
                              {submission.name}
                            </p>
                            <Badge tone={tone}>
                              {STATUS_LABEL[currentStatus] ?? currentStatus}
                            </Badge>
                          </div>
                          <div
                            className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
                            style={{ color: "var(--admin-text-mute)" }}
                          >
                            <a
                              href={`mailto:${submission.email}`}
                              className="hover:underline"
                            >
                              {submission.email}
                            </a>
                            {submission.phone ? (
                              <>
                                <span aria-hidden>·</span>
                                <a
                                  href={`tel:${submission.phone}`}
                                  className="hover:underline"
                                >
                                  {submission.phone}
                                </a>
                              </>
                            ) : null}
                            <span aria-hidden>·</span>
                            <time
                              dateTime={new Date(
                                submission.createdAt,
                              ).toISOString()}
                              title={formatDate(submission.createdAt)}
                            >
                              {formatDistanceToNow(submission.createdAt, {
                                addSuffix: true,
                              })}
                            </time>
                            {submission.repliedAt ? (
                              <>
                                <span aria-hidden>·</span>
                                <span style={{ color: "var(--admin-text-soft)" }}>
                                  Replied {formatDate(submission.repliedAt)}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <blockquote
                        className="rounded-lg px-4 py-3 text-sm leading-relaxed"
                        style={{
                          backgroundColor: "var(--admin-surface-2)",
                          color: "var(--admin-text)",
                          borderLeft: "3px solid var(--admin-accent)",
                        }}
                      >
                        <p className="whitespace-pre-wrap wrap-break-word">
                          {submission.message}
                        </p>
                      </blockquote>

                      <div className="flex flex-wrap items-center gap-2">
                        <ButtonLink
                          href={`mailto:${submission.email}?subject=${replySubject}&body=${replyBody}`}
                          size="sm"
                        >
                          <Icon.Mail width={14} height={14} /> Reply by email
                        </ButtonLink>
                        {otherStatuses.map((s) => (
                          <form
                            key={s}
                            action={updateContactSubmissionStatus}
                            className="inline-flex"
                          >
                            <input
                              type="hidden"
                              name="id"
                              value={submission.id}
                            />
                            <input type="hidden" name="status" value={s} />
                            <StatusSubmitButton>
                              {s === "replied" ? (
                                <Icon.Check width={14} height={14} />
                              ) : null}
                              {s === "archived" ? (
                                <Icon.Archive width={14} height={14} />
                              ) : null}
                              {s === "read" ? (
                                <Icon.Eye width={14} height={14} />
                              ) : null}
                              {s === "new" ? (
                                <Icon.Bell width={14} height={14} />
                              ) : null}
                              Mark {STATUS_LABEL[s].toLowerCase()}
                            </StatusSubmitButton>
                          </form>
                        ))}
                      </div>
                    </div>

                    <form
                      action={updateContactSubmissionNotes}
                      className="flex flex-col gap-2 rounded-lg p-3"
                      style={{
                        backgroundColor: "var(--admin-surface-2)",
                        border: "1px dashed var(--admin-border-strong)",
                      }}
                    >
                      <input type="hidden" name="id" value={submission.id} />
                      <label
                        htmlFor={notesId}
                        className="text-[11px] font-semibold uppercase tracking-[0.12em]"
                        style={{ color: "var(--admin-text-mute)" }}
                      >
                        Internal notes
                      </label>
                      <textarea
                        id={notesId}
                        name="notes"
                        defaultValue={submission.adminNotes ?? ""}
                        rows={4}
                        placeholder="Only visible to your team — context, follow-up dates, links…"
                        className="min-h-24 flex-1 rounded-md px-3 py-2 text-sm focus:outline-none"
                        style={{
                          backgroundColor: "var(--admin-surface)",
                          border: "1px solid var(--admin-border-strong)",
                          color: "var(--admin-text)",
                        }}
                      />
                      <div className="flex justify-end">
                        <SubmitButton
                          size="sm"
                          variant="secondary"
                          pendingLabel="Saving…"
                        >
                          Save note
                        </SubmitButton>
                      </div>
                    </form>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={<Icon.Mail width={28} height={28} />}
          title={
            filtersActive
              ? "No messages match your filters"
              : "No messages yet"
          }
          description={
            filtersActive
              ? "Try clearing the search or switching to All to see every submission."
              : "Replies from the contact form will appear here."
          }
          action={
            filtersActive ? (
              <ButtonLink
                href="/admin/messages"
                variant="secondary"
                size="sm"
              >
                Clear filters
              </ButtonLink>
            ) : null
          }
        />
      )}
    </>
  );
}
