import {
  updateContactSubmissionNotes,
  updateContactSubmissionStatus,
} from "./actions";

import { contactRepository } from "@/lib/repositories/contact-repository";
import { formatDate } from "@/lib/utils/formatters";

function statusClasses(status: string) {
  if (status === "new") {
    return "bg-blue-100 text-blue-700";
  }

  if (status === "replied") {
    return "bg-emerald-100 text-emerald-700";
  }

  return "bg-zinc-100 text-zinc-700";
}

async function loadMessagesPageData() {
  try {
    const [stats, submissions] = await Promise.all([
      contactRepository.getAdminStats(),
      contactRepository.listForAdmin(100),
    ]);

    return {
      stats,
      submissions,
    };
  } catch {
    return {
      stats: {
        total: 0,
        newCount: 0,
        repliedCount: 0,
      },
      submissions: [],
    };
  }
}

export default async function AdminMessagesPage() {
  const { stats, submissions } = await loadMessagesPageData();

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-zinc-900">
          Contact submissions
        </h2>
        <p className="text-sm text-zinc-500">Latest 100 entries</p>
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
            New
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {stats.newCount}
          </p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Replied
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {stats.repliedCount}
          </p>
        </div>
      </div>

      {submissions.length > 0 ? (
        <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <caption className="sr-only">
              Contact submissions with sender details, message content, workflow
              controls, and received date.
            </caption>
            <thead className="bg-zinc-50">
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
                <th scope="col" className="px-4 py-3">
                  Sender
                </th>
                <th scope="col" className="px-4 py-3">
                  Message
                </th>
                <th scope="col" className="px-4 py-3">
                  Workflow
                </th>
                <th scope="col" className="px-4 py-3">
                  Received
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {submissions.map((submission) => {
                const statusFieldId = `submission-status-${submission.id}`;
                const notesFieldId = `submission-notes-${submission.id}`;

                return (
                  <tr key={submission.id}>
                    <th scope="row" className="px-4 py-3 text-left align-top">
                      <p className="font-medium text-zinc-900">
                        {submission.name}
                      </p>
                      <a
                        href={`mailto:${submission.email}`}
                        className="text-xs text-zinc-500 hover:text-zinc-700"
                      >
                        {submission.email}
                      </a>
                      {submission.phone ? (
                        <p className="text-xs text-zinc-500">
                          {submission.phone}
                        </p>
                      ) : null}
                    </th>
                    <td className="px-4 py-3 align-top text-zinc-600">
                      <p className="max-w-xl whitespace-pre-wrap wrap-break-word">
                        {submission.message}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-2 py-1 text-xs uppercase tracking-[0.06em] ${statusClasses(submission.status)}`}
                          >
                            {submission.status}
                          </span>
                          {submission.repliedAt ? (
                            <span className="text-xs text-zinc-500">
                              Replied {formatDate(submission.repliedAt)}
                            </span>
                          ) : null}
                        </div>

                        <form
                          action={updateContactSubmissionStatus}
                          className="space-y-2"
                        >
                          <input
                            type="hidden"
                            name="id"
                            value={submission.id}
                          />
                          <label htmlFor={statusFieldId} className="sr-only">
                            Update status for {submission.email}
                          </label>
                          <select
                            id={statusFieldId}
                            name="status"
                            defaultValue={submission.status}
                            className="h-9 w-full min-w-36 rounded border border-zinc-300 bg-white px-2 text-xs uppercase tracking-[0.06em] text-zinc-700"
                          >
                            <option value="new">New</option>
                            <option value="read">Read</option>
                            <option value="replied">Replied</option>
                            <option value="archived">Archived</option>
                          </select>
                          <button
                            type="submit"
                            className="inline-flex h-8 items-center rounded bg-zinc-900 px-3 text-xs font-medium uppercase tracking-[0.06em] text-white hover:bg-zinc-700"
                          >
                            Update status
                          </button>
                        </form>

                        <form
                          action={updateContactSubmissionNotes}
                          className="space-y-2"
                        >
                          <input
                            type="hidden"
                            name="id"
                            value={submission.id}
                          />
                          <label htmlFor={notesFieldId} className="sr-only">
                            Internal notes for {submission.email}
                          </label>
                          <textarea
                            id={notesFieldId}
                            name="notes"
                            defaultValue={submission.adminNotes ?? ""}
                            rows={3}
                            placeholder="Internal notes"
                            className="w-full min-w-36 rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-700"
                          />
                          <button
                            type="submit"
                            className="inline-flex h-8 items-center rounded border border-zinc-300 px-3 text-xs font-medium uppercase tracking-[0.06em] text-zinc-700 hover:bg-zinc-100"
                          >
                            Save note
                          </button>
                        </form>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-zinc-600">
                      {formatDate(submission.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          No submissions yet. Messages from the contact form will appear here.
        </div>
      )}
    </section>
  );
}
