import Link from "next/link";

import { blogRepository } from "@/lib/repositories/blog-repository";

import {
  createCategoryAction,
  createTagAction,
  updateCategoryAction,
  updateTagAction,
} from "./actions";

async function loadTaxonomyForAdmin() {
  try {
    const [categories, tags] = await Promise.all([
      blogRepository.listCategoriesForAdmin(),
      blogRepository.listTagsForAdmin(),
    ]);

    return { categories, tags };
  } catch {
    return { categories: [], tags: [] };
  }
}

export default async function AdminBlogCategoriesPage() {
  const { categories, tags } = await loadTaxonomyForAdmin();

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">
            Manage blog taxonomy
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Create and maintain categories and tags used across blog posts.
          </p>
        </div>

        <Link
          href="/admin/blog"
          className="inline-flex h-10 items-center rounded border border-zinc-300 px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
        >
          Back to posts
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-4 rounded border border-zinc-200 bg-white p-5">
          <h3 className="text-base font-semibold text-zinc-900">Categories</h3>

          <form action={createCategoryAction} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                name="name"
                placeholder="Name"
                required
                className="h-10 rounded border border-zinc-300 px-3 text-sm text-zinc-900"
              />
              <input
                name="slug"
                placeholder="Slug (optional)"
                className="h-10 rounded border border-zinc-300 px-3 text-sm text-zinc-900"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_120px]">
              <input
                name="description"
                placeholder="Description (optional)"
                className="h-10 rounded border border-zinc-300 px-3 text-sm text-zinc-900"
              />
              <input
                name="position"
                type="number"
                min={0}
                defaultValue={0}
                className="h-10 rounded border border-zinc-300 px-3 text-sm text-zinc-900"
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-9 items-center rounded bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Add category
            </button>
          </form>

          {categories.length > 0 ? (
            <div className="space-y-2">
              {categories.map((category) => (
                <form
                  key={category.id}
                  action={updateCategoryAction}
                  className="space-y-2 rounded border border-zinc-200 p-3"
                >
                  <input type="hidden" name="id" value={category.id} />

                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      name="name"
                      defaultValue={category.name}
                      required
                      className="h-9 rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                    />
                    <input
                      name="slug"
                      defaultValue={category.slug}
                      className="h-9 rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                    />
                  </div>

                  <div className="grid gap-2 md:grid-cols-[1fr_100px_auto]">
                    <input
                      name="description"
                      defaultValue={category.description ?? ""}
                      placeholder="Description"
                      className="h-9 rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                    />
                    <input
                      name="position"
                      type="number"
                      min={0}
                      defaultValue={category.position}
                      className="h-9 rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                    />
                    <button
                      type="submit"
                      className="inline-flex h-9 items-center justify-center rounded border border-zinc-300 px-3 text-xs font-medium uppercase tracking-[0.06em] text-zinc-700 hover:bg-zinc-100"
                    >
                      Save
                    </button>
                  </div>

                  <p className="text-xs text-zinc-500">
                    Used by {category.postCount} post
                    {category.postCount === 1 ? "" : "s"}
                  </p>
                </form>
              ))}
            </div>
          ) : (
            <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
              No categories yet.
            </p>
          )}
        </section>

        <section className="space-y-4 rounded border border-zinc-200 bg-white p-5">
          <h3 className="text-base font-semibold text-zinc-900">Tags</h3>

          <form action={createTagAction} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                name="name"
                placeholder="Name"
                required
                className="h-10 rounded border border-zinc-300 px-3 text-sm text-zinc-900"
              />
              <input
                name="slug"
                placeholder="Slug (optional)"
                className="h-10 rounded border border-zinc-300 px-3 text-sm text-zinc-900"
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-9 items-center rounded bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Add tag
            </button>
          </form>

          {tags.length > 0 ? (
            <div className="space-y-2">
              {tags.map((tag) => (
                <form
                  key={tag.id}
                  action={updateTagAction}
                  className="space-y-2 rounded border border-zinc-200 p-3"
                >
                  <input type="hidden" name="id" value={tag.id} />

                  <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                    <input
                      name="name"
                      defaultValue={tag.name}
                      required
                      className="h-9 rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                    />
                    <input
                      name="slug"
                      defaultValue={tag.slug}
                      className="h-9 rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                    />
                    <button
                      type="submit"
                      className="inline-flex h-9 items-center justify-center rounded border border-zinc-300 px-3 text-xs font-medium uppercase tracking-[0.06em] text-zinc-700 hover:bg-zinc-100"
                    >
                      Save
                    </button>
                  </div>

                  <p className="text-xs text-zinc-500">
                    Used by {tag.postCount} post{tag.postCount === 1 ? "" : "s"}
                  </p>
                </form>
              ))}
            </div>
          ) : (
            <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
              No tags yet.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
