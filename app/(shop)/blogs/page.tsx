import Link from "next/link";

import { BlogCard } from "@/components/shop/blog-card";
import { NativeSubmitButton } from "@/components/ui/submit-button";
import { blogRepository } from "@/lib/repositories/blog-repository";
import { toPlainText } from "@/lib/seo";
import { resolveUrl } from "@/lib/storage/resolve-url";
import { formatDate } from "@/lib/utils/formatters";

type BlogsPageSearchParams = {
  q?: string | string[];
  category?: string | string[];
  tag?: string | string[];
  page?: string | string[];
};

type BlogsPageProps = {
  searchParams: Promise<BlogsPageSearchParams>;
};

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function readPositiveInt(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function buildPageHref(baseParams: URLSearchParams, page: number) {
  const params = new URLSearchParams(baseParams);

  if (page > 1) {
    params.set("page", String(page));
  } else {
    params.delete("page");
  }

  const queryString = params.toString();
  return queryString ? `/blogs?${queryString}` : "/blogs";
}

async function loadPublishedPosts(input: {
  query?: string;
  category?: string;
  tag?: string;
  page?: number;
}) {
  try {
    return await blogRepository.listPublishedPage({
      query: input.query,
      category: input.category,
      tag: input.tag,
      page: input.page,
      pageSize: 8,
    });
  } catch {
    return {
      rows: [],
      total: 0,
      page: 1,
      pageSize: 8,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  }
}

async function loadTaxonomyOptions() {
  try {
    return await blogRepository.listPublishedTaxonomyOptions();
  } catch {
    return {
      categories: [],
      tags: [],
    };
  }
}

export const revalidate = 1800;

export default async function BlogsPage({ searchParams }: BlogsPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = readSingle(resolvedSearchParams.q)?.trim() ?? "";
  const category = readSingle(resolvedSearchParams.category)?.trim() ?? "";
  const tag = readSingle(resolvedSearchParams.tag)?.trim() ?? "";
  const page = readPositiveInt(readSingle(resolvedSearchParams.page)) ?? 1;
  const [posts, taxonomy] = await Promise.all([
    loadPublishedPosts({
      query: query || undefined,
      category: category || undefined,
      tag: tag || undefined,
      page,
    }),
    loadTaxonomyOptions(),
  ]);

  const paramsWithoutPage = new URLSearchParams();
  if (query) {
    paramsWithoutPage.set("q", query);
  }
  if (category) {
    paramsWithoutPage.set("category", category);
  }
  if (tag) {
    paramsWithoutPage.set("tag", tag);
  }

  const firstItem =
    posts.total === 0 ? 0 : (posts.page - 1) * posts.pageSize + 1;
  const lastItem =
    posts.total === 0 ? 0 : firstItem + Math.max(posts.rows.length - 1, 0);

  const pageWindow = 2;
  const startPage = Math.max(1, posts.page - pageWindow);
  const endPage = Math.min(posts.totalPages, posts.page + pageWindow);
  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index,
  );

  return (
    <section className="container-page py-14 md:py-20">
      <h1 className="font-serif text-4xl text-maroon-900 md:text-5xl">Blogs</h1>
      <p className="mt-4 max-w-2xl text-base text-warm-gray-700">
        Stories, guides, and cultural notes from our workshop and collectors.
      </p>

      <form className="mt-8 grid gap-3 border border-border-light bg-white p-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 md:col-span-2">
          <span className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
            Search Articles
          </span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Title or excerpt"
            className="h-10 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
            Category
          </span>
          <select
            name="category"
            defaultValue={category}
            className="h-10 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900"
          >
            <option value="">All Categories</option>
            {taxonomy.categories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name} ({item.count})
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
            Tag
          </span>
          <select
            name="tag"
            defaultValue={tag}
            className="h-10 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900"
          >
            <option value="">All Tags</option>
            {taxonomy.tags.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name} ({item.count})
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2 md:col-span-2 lg:col-span-4">
          <NativeSubmitButton
            className="inline-flex h-10 items-center justify-center gap-2 bg-maroon-700 px-4 text-xs font-medium uppercase tracking-[0.06em] text-white transition enabled:hover:bg-maroon-800"
            pendingLabel="Searching…"
            spinnerSize={12}
          >
            Search
          </NativeSubmitButton>
          <Link
            href="/blogs"
            className="inline-flex h-10 items-center border border-border-light px-4 text-xs font-medium uppercase tracking-[0.06em] text-warm-gray-700 hover:bg-bg-secondary"
          >
            Reset
          </Link>
        </div>
      </form>

      <p className="mt-5 text-xs uppercase tracking-[0.08em] text-warm-gray-500">
        Showing {firstItem}-{lastItem} of {posts.total} article
        {posts.total === 1 ? "" : "s"}
      </p>

      {posts.rows.length > 0 ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {posts.rows.map((post) => (
            <BlogCard
              key={post.id}
              slug={post.slug}
              title={post.title}
              excerpt={
                post.excerpt ??
                `${toPlainText(post.content).slice(0, 150).trim()}...`
              }
              publishedAt={formatDate(post.publishedAt ?? post.createdAt)}
              image={
                resolveUrl(
                  post.featuredImageBucket && post.featuredImagePath
                    ? {
                        bucket: post.featuredImageBucket,
                        path: post.featuredImagePath,
                      }
                    : null,
                ) ?? "/next.svg"
              }
            />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-warm-gray-600">
          {query || category || tag
            ? "No blog posts match your current filters."
            : "Blog posts will appear here once they are published."}
        </p>
      )}

      {posts.totalPages > 1 ? (
        <nav
          aria-label="Blog listing pages"
          className="mt-10 flex flex-wrap items-center gap-2"
        >
          {posts.hasPreviousPage ? (
            <Link
              href={buildPageHref(
                paramsWithoutPage,
                Math.max(1, posts.page - 1),
              )}
              className="inline-flex h-9 items-center border border-border-light px-3 text-xs uppercase tracking-[0.08em] text-warm-gray-700 hover:bg-bg-secondary"
            >
              Previous
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex h-9 cursor-not-allowed items-center border border-border-light px-3 text-xs uppercase tracking-[0.08em] text-warm-gray-400"
            >
              Previous
            </span>
          )}

          {pageNumbers.map((pageNumber) => {
            const isActive = pageNumber === posts.page;

            return (
              <Link
                key={pageNumber}
                href={buildPageHref(paramsWithoutPage, pageNumber)}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex h-9 min-w-9 items-center justify-center border px-3 text-sm ${isActive ? "border-maroon-700 bg-maroon-700 text-white" : "border-border-light text-warm-gray-700 hover:bg-bg-secondary"}`}
              >
                {pageNumber}
              </Link>
            );
          })}

          {posts.hasNextPage ? (
            <Link
              href={buildPageHref(
                paramsWithoutPage,
                Math.min(posts.totalPages, posts.page + 1),
              )}
              className="inline-flex h-9 items-center border border-border-light px-3 text-xs uppercase tracking-[0.08em] text-warm-gray-700 hover:bg-bg-secondary"
            >
              Next
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex h-9 cursor-not-allowed items-center border border-border-light px-3 text-xs uppercase tracking-[0.08em] text-warm-gray-400"
            >
              Next
            </span>
          )}
        </nav>
      ) : null}
    </section>
  );
}
