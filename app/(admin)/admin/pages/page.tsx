import Link from "next/link";

import { pagesRepository } from "@/lib/repositories/pages-repository";

async function loadPagesForAdmin() {
  try {
    return await pagesRepository.listForAdmin(120);
  } catch {
    return [];
  }
}

export default async function AdminPagesPage() {
  const pages = await loadPagesForAdmin();

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-zinc-900">Static pages</h2>
        <Link
          href="/admin/pages/new"
          className="inline-flex h-10 items-center rounded bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700"
        >
          New page
        </Link>
      </div>

      {pages.length > 0 ? (
        <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <caption className="sr-only">
              Static pages with publication status, update date, and actions.
            </caption>
            <thead className="bg-zinc-50">
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
                <th scope="col" className="px-4 py-3">
                  Title
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  Updated
                </th>
                <th scope="col" className="px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {pages.map((page) => (
                <tr key={page.id}>
                  <th scope="row" className="px-4 py-3 text-left">
                    <p className="font-medium text-zinc-900">{page.title}</p>
                    <p className="text-xs text-zinc-500">/pages/{page.slug}</p>
                  </th>
                  <td className="px-4 py-3">
                    <span className="rounded bg-zinc-100 px-2 py-1 text-xs uppercase tracking-[0.06em] text-zinc-700">
                      {page.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {page.updatedAt.toLocaleDateString("en-US")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/pages/${page.id}`}
                      className="text-sm font-medium text-zinc-900 hover:text-zinc-700"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          No static pages yet. Create your first policy or about page.
        </div>
      )}
    </section>
  );
}
