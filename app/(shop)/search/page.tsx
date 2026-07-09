import Link from "next/link";

import { BlogCard } from "@/components/shop/blog-card";
import { ProductCard } from "@/components/shop/product-card";
import { blogRepository } from "@/lib/repositories/blog-repository";
import { productRepository } from "@/lib/repositories/product-repository";
import { toPlainText } from "@/lib/seo";
import { resolveUrl } from "@/lib/storage/resolve-url";
import { formatDate } from "@/lib/utils/formatters";

type SearchPageSearchParams = {
  q?: string | string[];
};

type SearchPageProps = {
  searchParams: Promise<SearchPageSearchParams>;
};

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

async function loadResults(query: string) {
  try {
    const [products, posts] = await Promise.all([
      productRepository.searchFullText({ query, limit: 8 }),
      blogRepository.searchPublishedFullText({ query, limit: 8 }),
    ]);

    return { products, posts };
  } catch {
    return {
      products: [],
      posts: [],
    };
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = readSingle(resolvedSearchParams.q)?.trim() ?? "";
  const hasQuery = query.length > 0;

  const { products, posts } = hasQuery
    ? await loadResults(query)
    : { products: [], posts: [] };

  const totalResults = products.length + posts.length;

  return (
    <section className="container-page py-14 md:py-20">
      <h1 className="font-serif text-4xl text-ink md:text-5xl">
        Search
      </h1>
      <p className="mt-4 max-w-2xl text-base text-ink-soft">
        Search across products and journal articles.
      </p>

      <form className="mt-8 flex flex-col gap-3 rounded-md border border-paper-3 bg-paper p-4 sm:flex-row sm:items-end">
        <label className="w-full space-y-1 sm:max-w-lg">
          <span className="text-xs uppercase tracking-[0.08em] text-ink-mute">
            Query
          </span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Thangka, Tara, mandala, symbolism..."
            className="h-11 w-full rounded-md border border-paper-3 bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-saffron focus:ring-offset-1"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-md bg-ink px-5 text-xs font-medium uppercase tracking-[0.06em] text-paper transition-colors hover:bg-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            Search
          </button>
          <Link
            href="/search"
            className="inline-flex h-11 items-center rounded-md border border-paper-3 px-5 text-xs font-medium uppercase tracking-[0.06em] text-ink-soft transition-colors hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            Reset
          </Link>
        </div>
      </form>

      {hasQuery ? (
        <p className="mt-5 text-xs uppercase tracking-[0.08em] text-ink-mute">
          {totalResults} result{totalResults === 1 ? "" : "s"} for &quot;
          {query}
          &quot;
        </p>
      ) : (
        <p className="mt-5 text-sm text-ink-mute">
          Enter a keyword to find matching products and articles.
        </p>
      )}

      {hasQuery && totalResults === 0 ? (
        <div className="mt-8 rounded-md border border-(--line-soft) bg-paper-2/40 p-10 text-center">
          <p className="font-serif text-2xl text-ink">No matches found</p>
          <p className="mt-2 text-sm text-ink-soft">
            Try a broader phrase, check spelling, or browse the full archive.
          </p>
          <Link
            href="/products"
            className="mt-5 inline-flex rounded-full bg-ink px-5 py-2.5 text-[12px] uppercase tracking-[0.14em] text-paper transition-colors hover:bg-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            Browse all products
          </Link>
        </div>
      ) : null}

      {products.length > 0 ? (
        <section className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-2xl text-ink">Products</h2>
            <Link
              href={`/products?q=${encodeURIComponent(query)}`}
              className="text-xs uppercase tracking-[0.08em] text-ink-soft"
            >
              View all products
            </Link>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const primaryImage = resolveUrl(product.primaryImage);
              const secondaryImage = resolveUrl(
                product.secondaryImage ?? product.primaryImage,
              );

              return (
                <ProductCard
                  key={product.id}
                  slug={product.slug}
                  title={product.title}
                  priceCents={product.price}
                  primaryImage={primaryImage ?? "/next.svg"}
                  secondaryImage={
                    secondaryImage ?? primaryImage ?? "/vercel.svg"
                  }
                />
              );
            })}
          </div>
        </section>
      ) : null}

      {posts.length > 0 ? (
        <section className="mt-12">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-2xl text-ink">Articles</h2>
            <Link
              href={`/blogs?q=${encodeURIComponent(query)}`}
              className="text-xs uppercase tracking-[0.08em] text-ink-soft"
            >
              View all articles
            </Link>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            {posts.map((post) => (
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
        </section>
      ) : null}
    </section>
  );
}
