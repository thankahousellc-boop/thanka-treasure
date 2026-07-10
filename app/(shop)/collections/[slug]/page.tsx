import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";

import { ProductCard } from "@/components/shop/product-card";
import { PageShell } from "@/components/ui/page-shell";
import { collectionRepository } from "@/lib/repositories/collection-repository";
import { productRepository } from "@/lib/repositories/product-repository";
import { buildMetaDescription, getAbsoluteUrl } from "@/lib/seo";
import { resolveUrl } from "@/lib/storage/resolve-url";

type CollectionPageSearchParams = {
  q?: string | string[];
  min?: string | string[];
  max?: string | string[];
  sort?: string | string[];
  page?: string | string[];
};

type CollectionPageRouteProps = {
  params: Promise<{ slug: string }>;
};

type CollectionPageProps = CollectionPageRouteProps & {
  searchParams: Promise<CollectionPageSearchParams>;
};

type ProductSort = "newest" | "oldest" | "title" | "price_asc" | "price_desc";

type Grouping = {
  kind: "collection" | "category";
  id: string;
  slug: string;
  title: string;
  description: string | null;
  imageBucket: string | null;
  imagePath: string | null;
};

const GROUPING_NOT_FOUND_DESCRIPTION =
  "This collection page is unavailable or has not been configured yet.";
const GROUPING_META_FALLBACK =
  "Discover curated thanka artwork, with detailed filters and free worldwide shipping.";

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

function buildPageHref(
  basePath: string,
  baseParams: URLSearchParams,
  page: number,
) {
  const params = new URLSearchParams(baseParams);

  if (page > 1) {
    params.set("page", String(page));
  } else {
    params.delete("page");
  }

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

const getGrouping = cache(async (slug: string): Promise<Grouping | null> => {
  try {
    const collection = await collectionRepository.findBySlug(slug);
    if (collection) {
      return {
        kind: "collection",
        id: collection.id,
        slug: collection.slug,
        title: collection.title,
        description: collection.description,
        imageBucket: collection.imageBucket,
        imagePath: collection.imagePath,
      };
    }

    const category = await collectionRepository.findCategoryBySlug(slug);
    if (category) {
      return {
        kind: "category",
        id: category.id,
        slug: category.slug,
        title: category.name,
        description: category.description,
        imageBucket: category.imageBucket,
        imagePath: category.imagePath,
      };
    }

    return null;
  } catch {
    return null;
  }
});

async function loadProductsForGrouping(
  grouping: Grouping,
  input: {
    query?: string;
    minPrice?: number;
    maxPrice?: number;
    sort: ProductSort;
    page: number;
  },
) {
  try {
    if (grouping.kind === "collection") {
      return await productRepository.findByCollection({
        collectionId: grouping.id,
        query: input.query,
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
        sort: input.sort,
        page: input.page,
        limit: 12,
      });
    }

    return await productRepository.findByCategory({
      categorySlug: grouping.slug,
      categoryName: grouping.title,
      query: input.query,
      minPrice: input.minPrice,
      maxPrice: input.maxPrice,
      sort: input.sort,
      page: input.page,
      limit: 12,
    });
  } catch {
    return {
      rows: [],
      total: 0,
      page: 1,
      pageSize: 12,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  }
}

export const revalidate = 1800;

export async function generateStaticParams() {
  try {
    const [collectionSlugs, categorySlugs] = await Promise.all([
      collectionRepository.listSlugs(250),
      collectionRepository.listCategorySlugs(250),
    ]);

    const uniqueSlugs = Array.from(
      new Set([...collectionSlugs, ...categorySlugs]),
    );
    return uniqueSlugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: CollectionPageRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const grouping = await getGrouping(slug);

  if (!grouping) {
    return {
      title: "Collection not found",
      description: GROUPING_NOT_FOUND_DESCRIPTION,
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const canonicalUrl = getAbsoluteUrl(`/collections/${grouping.slug}`);
  const description = buildMetaDescription(
    grouping.description,
    GROUPING_META_FALLBACK,
  );
  const coverImage =
    grouping.imageBucket && grouping.imagePath
      ? resolveUrl({
          bucket: grouping.imageBucket,
          path: grouping.imagePath,
        })
      : null;

  return {
    title: grouping.title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      title: grouping.title,
      description,
      url: canonicalUrl,
      images: coverImage
        ? [
            {
              url: coverImage,
              alt: grouping.title,
              width: 1200,
              height: 630,
            },
          ]
        : undefined,
    },
    twitter: {
      card: coverImage ? "summary_large_image" : "summary",
      title: grouping.title,
      description,
      images: coverImage ? [coverImage] : undefined,
    },
  };
}

export default async function CollectionPage({
  params,
  searchParams,
}: CollectionPageProps) {
  const { slug } = await params;
  const grouping = await getGrouping(slug);

  if (!grouping) {
    return (
      <PageShell
        title="Collection not found"
        description={GROUPING_NOT_FOUND_DESCRIPTION}
      />
    );
  }

  const resolvedSearchParams = await searchParams;
  const query = readSingle(resolvedSearchParams.q)?.trim() ?? "";
  const minPriceUsd = readPositiveInt(readSingle(resolvedSearchParams.min));
  const rawMaxPriceUsd = readPositiveInt(readSingle(resolvedSearchParams.max));
  const maxPriceUsd =
    minPriceUsd !== undefined &&
    rawMaxPriceUsd !== undefined &&
    rawMaxPriceUsd < minPriceUsd
      ? minPriceUsd
      : rawMaxPriceUsd;
  const minPrice = minPriceUsd !== undefined ? minPriceUsd * 100 : undefined;
  const maxPrice = maxPriceUsd !== undefined ? maxPriceUsd * 100 : undefined;
  const requestedSort = readSingle(resolvedSearchParams.sort) ?? "newest";
  const sort: ProductSort =
    requestedSort === "oldest" ||
    requestedSort === "title" ||
    requestedSort === "price_asc" ||
    requestedSort === "price_desc"
      ? requestedSort
      : "newest";
  const page = readPositiveInt(readSingle(resolvedSearchParams.page)) ?? 1;

  const catalog = await loadProductsForGrouping(grouping, {
    query: query || undefined,
    minPrice,
    maxPrice,
    sort,
    page,
  });

  const basePath = `/collections/${grouping.slug}`;
  const paramsWithoutPage = new URLSearchParams();
  if (query) {
    paramsWithoutPage.set("q", query);
  }
  if (minPriceUsd !== undefined) {
    paramsWithoutPage.set("min", String(minPriceUsd));
  }
  if (maxPriceUsd !== undefined) {
    paramsWithoutPage.set("max", String(maxPriceUsd));
  }
  if (sort !== "newest") {
    paramsWithoutPage.set("sort", sort);
  }

  const firstItem =
    catalog.total === 0 ? 0 : (catalog.page - 1) * catalog.pageSize + 1;
  const lastItem =
    catalog.total === 0 ? 0 : firstItem + Math.max(catalog.rows.length - 1, 0);
  const hasActiveFilters =
    query.length > 0 ||
    minPriceUsd !== undefined ||
    maxPriceUsd !== undefined ||
    sort !== "newest";

  const pageWindow = 2;
  const startPage = Math.max(1, catalog.page - pageWindow);
  const endPage = Math.min(catalog.totalPages, catalog.page + pageWindow);
  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index,
  );

  const coverImage =
    grouping.imageBucket && grouping.imagePath
      ? resolveUrl({
          bucket: grouping.imageBucket,
          path: grouping.imagePath,
        })
      : null;
  const label = grouping.kind === "collection" ? "Collection" : "Category";

  return (
    <section className="container-page py-14 md:py-20">
      <p className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
        {label}
      </p>
      <h1 className="mt-2 font-serif text-4xl text-maroon-900 md:text-5xl">
        {grouping.title}
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-warm-gray-700">
        {grouping.description ??
          "Explore handpicked Tibetan thanka pieces in this curated group."}
      </p>

      {coverImage ? (
        <div className="relative mt-8 aspect-16/6 overflow-hidden border border-border-light bg-bg-secondary">
          <Image
            src={coverImage}
            alt={grouping.title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 1200px"
            className="object-cover"
          />
        </div>
      ) : null}

      <form className="mt-8 grid gap-3 border border-paper-3 bg-paper p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <label className="space-y-1 sm:col-span-2 md:col-span-3 lg:col-span-2">
          <span className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
            Search
          </span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Product title or keyword"
            className="h-10 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
            Min Price (Base USD)
          </span>
          <input
            type="number"
            min={0}
            step={1}
            name="min"
            defaultValue={minPriceUsd ?? ""}
            className="h-10 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
            Max Price (Base USD)
          </span>
          <input
            type="number"
            min={0}
            step={1}
            name="max"
            defaultValue={maxPriceUsd ?? ""}
            className="h-10 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
            Sort
          </span>
          <select
            name="sort"
            defaultValue={sort}
            className="h-10 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="title">Title (A-Z)</option>
            <option value="price_asc">Price low to high</option>
            <option value="price_desc">Price high to low</option>
          </select>
        </label>

        <div className="flex items-end gap-2 md:col-span-2 lg:col-span-5">
          <button
            type="submit"
            className="inline-flex h-10 items-center bg-maroon-700 px-4 text-xs font-medium uppercase tracking-[0.06em] text-white hover:bg-maroon-800"
          >
            Apply Filters
          </button>
          <Link
            href={basePath}
            className="inline-flex h-10 items-center border border-border-light px-4 text-xs font-medium uppercase tracking-[0.06em] text-warm-gray-700 hover:bg-bg-secondary"
          >
            Reset
          </Link>
        </div>
      </form>

      <p className="mt-5 text-xs uppercase tracking-[0.08em] text-warm-gray-500">
        Showing {firstItem}-{lastItem} of {catalog.total} item
        {catalog.total === 1 ? "" : "s"}
      </p>

      {catalog.rows.length > 0 ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {catalog.rows.map((product) => {
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
                secondaryImage={secondaryImage ?? primaryImage ?? "/vercel.svg"}
              />
            );
          })}
        </div>
      ) : (
        <div className="mt-8 border border-border-light bg-white p-6 text-sm text-warm-gray-600">
          {hasActiveFilters
            ? "No products match your current filters."
            : "No products are available in this section yet."}
        </div>
      )}

      {catalog.totalPages > 1 ? (
        <nav
          aria-label={`${label} listing pages`}
          className="mt-10 flex flex-wrap items-center gap-2"
        >
          {catalog.hasPreviousPage ? (
            <Link
              href={buildPageHref(
                basePath,
                paramsWithoutPage,
                Math.max(1, catalog.page - 1),
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
            const isActive = pageNumber === catalog.page;

            return (
              <Link
                key={pageNumber}
                href={buildPageHref(basePath, paramsWithoutPage, pageNumber)}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex h-9 min-w-9 items-center justify-center border px-3 text-sm ${isActive ? "border-maroon-700 bg-maroon-700 text-white" : "border-border-light text-warm-gray-700 hover:bg-bg-secondary"}`}
              >
                {pageNumber}
              </Link>
            );
          })}

          {catalog.hasNextPage ? (
            <Link
              href={buildPageHref(
                basePath,
                paramsWithoutPage,
                Math.min(catalog.totalPages, catalog.page + 1),
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
