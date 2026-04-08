import Link from "next/link";

import { ProductCard } from "@/components/shop/product-card";
import {
  convertUsdToCurrency,
  getCurrencyContext,
} from "@/lib/currency/context";
import { productRepository } from "@/lib/repositories/product-repository";
import { resolveUrl } from "@/lib/storage/resolve-url";
import { formatCurrency } from "@/lib/utils/formatters";

type ProductsPageSearchParams = {
  q?: string | string[];
  type?: string | string[];
  min?: string | string[];
  max?: string | string[];
  sort?: string | string[];
  page?: string | string[];
};

type ProductsPageProps = {
  searchParams: Promise<ProductsPageSearchParams>;
};

type ProductSort = "newest" | "oldest" | "title" | "price_asc" | "price_desc";

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
  return queryString ? `/products?${queryString}` : "/products";
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const { currency, rates } = await getCurrencyContext();
  const resolvedSearchParams = await searchParams;
  const query = readSingle(resolvedSearchParams.q)?.trim() ?? "";
  const productType = readSingle(resolvedSearchParams.type)?.trim() ?? "";
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

  const [catalog, productTypes] = await Promise.all([
    productRepository.search({
      query: query || undefined,
      productType: productType || undefined,
      minPrice,
      maxPrice,
      sort,
      page,
      limit: 12,
    }),
    productRepository.listActiveProductTypes(),
  ]);

  const paramsWithoutPage = new URLSearchParams();
  if (query) {
    paramsWithoutPage.set("q", query);
  }
  if (productType) {
    paramsWithoutPage.set("type", productType);
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
    productType.length > 0 ||
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

  return (
    <section className="container-page py-14 md:py-20">
      <h1 className="font-serif text-4xl text-maroon-900 md:text-5xl">
        All Products
      </h1>
      <p className="mt-4 text-base text-warm-gray-700">
        Explore our current collection of hand-painted Thangka art pieces.
      </p>

      <form className="mt-8 grid gap-3 border border-border-light bg-white p-4 md:grid-cols-2 lg:grid-cols-6">
        <label className="space-y-1 md:col-span-2">
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
            Product Type
          </span>
          <select
            name="type"
            defaultValue={productType}
            className="h-10 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900"
          >
            <option value="">All</option>
            {productTypes.map((typeOption) => (
              <option key={typeOption} value={typeOption}>
                {typeOption}
              </option>
            ))}
          </select>
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

        <div className="flex items-end gap-2 md:col-span-2 lg:col-span-6">
          <button
            type="submit"
            className="inline-flex h-10 items-center bg-maroon-700 px-4 text-xs font-medium uppercase tracking-[0.06em] text-white hover:bg-maroon-800"
          >
            Apply Filters
          </button>
          <Link
            href="/products"
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
                price={
                  product.price !== null
                    ? formatCurrency(
                        convertUsdToCurrency(product.price, currency, rates),
                        currency,
                      )
                    : "Price available on request"
                }
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
            : "No products are available yet. Publish products in the admin dashboard to populate this page."}
        </div>
      )}

      {catalog.totalPages > 1 ? (
        <nav
          aria-label="Product listing pages"
          className="mt-10 flex flex-wrap items-center gap-2"
        >
          {catalog.hasPreviousPage ? (
            <Link
              href={buildPageHref(
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
                href={buildPageHref(paramsWithoutPage, pageNumber)}
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
