import Link from "next/link";

import { BlogCard } from "@/components/shop/blog-card";
import { ProductCard } from "@/components/shop/product-card";
import {
  convertUsdToCurrency,
  getCurrencyContext,
} from "@/lib/currency/context";
import { blogRepository } from "@/lib/repositories/blog-repository";
import { productRepository } from "@/lib/repositories/product-repository";
import { toPlainText } from "@/lib/seo";
import { resolveUrl } from "@/lib/storage/resolve-url";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

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
  const { currency, rates } = await getCurrencyContext();
  const resolvedSearchParams = await searchParams;
  const query = readSingle(resolvedSearchParams.q)?.trim() ?? "";
  const hasQuery = query.length > 0;

  const { products, posts } = hasQuery
    ? await loadResults(query)
    : { products: [], posts: [] };

  const totalResults = products.length + posts.length;

  return (
    <section className="container-page py-14 md:py-20">
      <h1 className="font-serif text-4xl text-maroon-900 md:text-5xl">
        Search
      </h1>
      <p className="mt-4 max-w-2xl text-base text-warm-gray-700">
        Search across products and journal articles.
      </p>

      <form className="mt-8 flex flex-col gap-3 border border-border-light bg-white p-4 sm:flex-row sm:items-end">
        <label className="w-full space-y-1 sm:max-w-lg">
          <span className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
            Query
          </span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Thangka, Tara, mandala, symbolism..."
            className="h-10 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex h-10 items-center bg-maroon-700 px-4 text-xs font-medium uppercase tracking-[0.06em] text-white hover:bg-maroon-800"
          >
            Search
          </button>
          <Link
            href="/search"
            className="inline-flex h-10 items-center border border-border-light px-4 text-xs font-medium uppercase tracking-[0.06em] text-warm-gray-700 hover:bg-bg-secondary"
          >
            Reset
          </Link>
        </div>
      </form>

      {hasQuery ? (
        <p className="mt-5 text-xs uppercase tracking-[0.08em] text-warm-gray-500">
          {totalResults} result{totalResults === 1 ? "" : "s"} for &quot;
          {query}
          &quot;
        </p>
      ) : (
        <p className="mt-5 text-sm text-warm-gray-600">
          Enter a keyword to find matching products and articles.
        </p>
      )}

      {hasQuery && totalResults === 0 ? (
        <div className="mt-8 border border-border-light bg-white p-6 text-sm text-warm-gray-600">
          No matches found. Try a broader phrase or browse{" "}
          <Link href="/products" className="font-medium text-maroon-700">
            all products
          </Link>
          .
        </div>
      ) : null}

      {products.length > 0 ? (
        <section className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-2xl text-maroon-900">Products</h2>
            <Link
              href={`/products?q=${encodeURIComponent(query)}`}
              className="text-xs uppercase tracking-[0.08em] text-maroon-700"
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
                  price={
                    product.price !== null
                      ? formatCurrency(
                          convertUsdToCurrency(product.price, currency, rates),
                          currency,
                        )
                      : "Price available on request"
                  }
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
            <h2 className="font-serif text-2xl text-maroon-900">Articles</h2>
            <Link
              href={`/blogs?q=${encodeURIComponent(query)}`}
              className="text-xs uppercase tracking-[0.08em] text-maroon-700"
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
