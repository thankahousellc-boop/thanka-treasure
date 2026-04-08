import Link from "next/link";

import { blogRepository } from "@/lib/repositories/blog-repository";

async function loadPostsForAdmin() {
  try {
    return await blogRepository.listForAdmin(50);
  } catch {
    return [];
  }
}

export default async function AdminBlogPage() {
  const posts = await loadPostsForAdmin();

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-zinc-900">
          Manage blog posts
        </h2>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/blog/categories"
            className="inline-flex h-10 items-center rounded border border-zinc-300 px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
          >
            Categories and tags
          </Link>
          <Link
            href="/admin/blog/new"
            className="inline-flex h-10 items-center rounded bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700"
          >
            New post
          </Link>
        </div>
      </div>

      {posts.length > 0 ? (
        <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <caption className="sr-only">
              Blog posts with status, view count, publish date, and actions.
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
                  Views
                </th>
                <th scope="col" className="px-4 py-3">
                  Published
                </th>
                <th scope="col" className="px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {posts.map((post) => (
                <tr key={post.id}>
                  <th scope="row" className="px-4 py-3 text-left">
                    <p className="font-medium text-zinc-900">{post.title}</p>
                    <p className="text-xs text-zinc-500">/{post.slug}</p>
                  </th>
                  <td className="px-4 py-3">
                    <span className="rounded bg-zinc-100 px-2 py-1 text-xs uppercase tracking-[0.06em] text-zinc-700">
                      {post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{post.viewCount}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {post.publishedAt
                      ? post.publishedAt.toLocaleDateString("en-US")
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/blog/${post.id}`}
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
          No posts found. Create and publish your first article.
        </div>
      )}
    </section>
  );
}
