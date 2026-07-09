import Link from "next/link";

import { ProductCard } from "@/components/shop/product-card";
import {
  getActiveProductTypes,
  getCatalogFacets,
} from "@/lib/catalog-taxonomy";
import { productRepository } from "@/lib/repositories/product-repository";
import { resolveUrl } from "@/lib/storage/resolve-url";

export const revalidate = 1800;

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
  if (Array.isArray(value)) return value[0];
  return value;
}

function readPositiveInt(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function buildQueryHref(params: URLSearchParams) {
  const queryString = params.toString();
  return queryString ? `/products?${queryString}` : "/products";
}

function buildPageHref(baseParams: URLSearchParams, page: number) {
  const params = new URLSearchParams(baseParams);
  if (page > 1) params.set("page", String(page));
  else params.delete("page");
  return buildQueryHref(params);
}

function buildTypeHref(baseParams: URLSearchParams, type: string | null) {
  const params = new URLSearchParams(baseParams);
  params.delete("page");
  if (type) params.set("type", type);
  else params.delete("type");
  return buildQueryHref(params);
}

// Toggle a single attribute facet value on/off, preserving every other filter.
function buildAttributeHref(
  baseParams: URLSearchParams,
  key: string,
  value: string,
  active: boolean,
) {
  const params = new URLSearchParams(baseParams);
  params.delete("page");
  const param = `attr_${key}`;
  const existing = params.getAll(param);
  params.delete(param);
  for (const current of existing) {
    if (current !== value) params.append(param, current);
  }
  if (!active) params.append(param, value);
  return buildQueryHref(params);
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
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

  // Dynamic attribute facets arrive as `?attr_<key>=value` (repeatable).
  const attributeFilters: Record<string, string[]> = {};
  for (const [rawKey, rawValue] of Object.entries(
    resolvedSearchParams as Record<string, string | string[] | undefined>,
  )) {
    if (!rawKey.startsWith("attr_")) continue;
    const key = rawKey.slice("attr_".length);
    const values = (
      Array.isArray(rawValue) ? rawValue : rawValue ? [rawValue] : []
    )
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (key && values.length > 0) {
      attributeFilters[key] = values;
    }
  }

  const [catalog, productTypes, facets] = await Promise.all([
    productRepository.search({
      query: query || undefined,
      productType: productType || undefined,
      minPrice,
      maxPrice,
      sort,
      page,
      limit: 12,
      attributes: attributeFilters,
    }),
    getActiveProductTypes(),
    getCatalogFacets(),
  ]);

  const paramsWithoutPage = new URLSearchParams();
  if (query) paramsWithoutPage.set("q", query);
  if (productType) paramsWithoutPage.set("type", productType);
  if (minPriceUsd !== undefined) paramsWithoutPage.set("min", String(minPriceUsd));
  if (maxPriceUsd !== undefined) paramsWithoutPage.set("max", String(maxPriceUsd));
  if (sort !== "newest") paramsWithoutPage.set("sort", sort);
  for (const [key, values] of Object.entries(attributeFilters)) {
    for (const value of values) {
      paramsWithoutPage.append(`attr_${key}`, value);
    }
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
    sort !== "newest" ||
    Object.keys(attributeFilters).length > 0;

  const pageWindow = 2;
  const startPage = Math.max(1, catalog.page - pageWindow);
  const endPage = Math.min(catalog.totalPages, catalog.page + pageWindow);
  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index,
  );

  const totalArchive = catalog.total;
  const distinctTypes = productTypes.length;

  return (
    <>
      {/* Shop hero */}
      <section className="border-b border-(--line-soft) pt-14 pb-10 md:pt-16 md:pb-12">
        <div className="container-page">
          <nav className="mb-4.5 text-xs uppercase tracking-[0.16em] text-ink-mute">
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
            <span className="mx-2.5 opacity-50">/</span>
            <span className="text-ink">Shop</span>
          </nav>
          <h1 className="font-serif text-[clamp(40px,5.5vw,68px)] leading-[1.05] font-medium tracking-[-0.01em] text-ink">
            The full <em className="font-normal text-ink-soft">archive</em>.
          </h1>
          <p className="mt-3.5 max-w-[60ch] text-[17px] leading-relaxed text-ink-soft">
            Hand-painted Thangkas, each a one-of-one. Browse by deity, lineage,
            size, or intention — every piece arrives with a certificate of
            authenticity, an artist&rsquo;s letter, and a hand-stitched silk
            wrap.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 text-[13px] tracking-[0.04em] text-ink-mute">
            <Stat value={String(totalArchive)} label="Pieces in archive" />
            <Stat value={String(distinctTypes || 0)} label="Categories" />
            <Stat value="4–18 mo" label="Time per piece" />
            <Stat value="USD" label="Reference currency" />
          </div>
        </div>
      </section>

      {/* Sticky toolbar */}
      <div className="sticky top-[64px] z-30 border-b border-(--line-soft) bg-paper md:top-[72px]">
        <div className="container-page flex flex-wrap items-center justify-between gap-5 py-5">
          <form
            action="/products"
            method="get"
            className="flex flex-1 items-center gap-2.5"
          >
            {productType ? (
              <input type="hidden" name="type" value={productType} />
            ) : null}
            {minPriceUsd !== undefined ? (
              <input type="hidden" name="min" value={minPriceUsd} />
            ) : null}
            {maxPriceUsd !== undefined ? (
              <input type="hidden" name="max" value={maxPriceUsd} />
            ) : null}
            {sort !== "newest" ? (
              <input type="hidden" name="sort" value={sort} />
            ) : null}
            <label className="flex min-w-[280px] items-center gap-2.5 rounded-full border border-(--line) bg-paper-2 px-4.5 py-2.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="text-ink-mute"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search by deity, mantra, artist…"
                className="flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-mute"
              />
            </label>
            <button
              type="submit"
              className="hidden rounded-full bg-ink px-5 py-2.5 text-[11.5px] font-medium uppercase tracking-[0.14em] text-paper hover:bg-ink-soft sm:inline-flex"
            >
              Search
            </button>
          </form>
          <div className="flex items-center gap-3.5">
            <span className="text-[13px] text-ink-mute">
              {firstItem === 0
                ? `0 pieces`
                : `${firstItem}–${lastItem} of ${catalog.total} pieces`}
            </span>
            <form action="/products" method="get" className="contents">
              {query ? <input type="hidden" name="q" value={query} /> : null}
              {productType ? (
                <input type="hidden" name="type" value={productType} />
              ) : null}
              {minPriceUsd !== undefined ? (
                <input type="hidden" name="min" value={minPriceUsd} />
              ) : null}
              {maxPriceUsd !== undefined ? (
                <input type="hidden" name="max" value={maxPriceUsd} />
              ) : null}
              <label className="flex items-center gap-2 rounded-full border border-(--line) px-4 py-2 text-[13px] tracking-[0.04em]">
                <span className="text-ink-mute">Sort</span>
                <select
                  name="sort"
                  defaultValue={sort}
                  className="border-0 bg-transparent text-[13px] font-medium text-ink outline-none"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="title">Title A–Z</option>
                  <option value="price_asc">Price: low → high</option>
                  <option value="price_desc">Price: high → low</option>
                </select>
                <button
                  type="submit"
                  aria-label="Apply sort"
                  className="text-ink-mute hover:text-ink"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </label>
            </form>
          </div>
        </div>
      </div>

      <div className="container-page grid grid-cols-[240px_1fr] items-start gap-12 pt-9 pb-24 max-md:grid-cols-1 max-md:gap-8">
        {/* Sidebar */}
        <aside className="sticky top-[150px] space-y-0 max-md:static max-md:top-auto">
          <SidebarGroup title="Category" first>
            <ul className="flex flex-col gap-2.5">
              <SidebarItem
                href={buildTypeHref(paramsWithoutPage, null)}
                active={!productType}
                count={totalArchive}
              >
                All Pieces
              </SidebarItem>
              {productTypes.map((type) => (
                <SidebarItem
                  key={type}
                  href={buildTypeHref(paramsWithoutPage, type)}
                  active={productType === type}
                >
                  {type}
                </SidebarItem>
              ))}
              {productTypes.length === 0 ? (
                <li className="text-sm text-ink-mute">
                  Categories appear once products are published.
                </li>
              ) : null}
            </ul>
          </SidebarGroup>

          <SidebarGroup title="Price">
            <form
              action="/products"
              method="get"
              className="space-y-3 pt-1.5"
            >
              {query ? <input type="hidden" name="q" value={query} /> : null}
              {productType ? (
                <input type="hidden" name="type" value={productType} />
              ) : null}
              {sort !== "newest" ? (
                <input type="hidden" name="sort" value={sort} />
              ) : null}
              {Object.entries(attributeFilters).flatMap(([key, values]) =>
                values.map((value) => (
                  <input
                    key={`${key}:${value}`}
                    type="hidden"
                    name={`attr_${key}`}
                    value={value}
                  />
                )),
              )}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  name="min"
                  defaultValue={minPriceUsd ?? ""}
                  placeholder="Min"
                  min={0}
                  className="h-9 w-full rounded-md border border-(--line) bg-paper px-2.5 text-[13px] text-ink outline-none focus:border-ink"
                />
                <span className="text-ink-mute">–</span>
                <input
                  type="number"
                  name="max"
                  defaultValue={maxPriceUsd ?? ""}
                  placeholder="Max"
                  min={0}
                  className="h-9 w-full rounded-md border border-(--line) bg-paper px-2.5 text-[13px] text-ink outline-none focus:border-ink"
                />
              </div>
              <button
                type="submit"
                className="text-[12px] uppercase tracking-[0.14em] text-ink-soft underline-offset-4 hover:text-ink hover:underline"
              >
                Apply price
              </button>
            </form>
          </SidebarGroup>

          {facets.map((facet) => (
            <SidebarGroup
              key={facet.definition.id}
              title={facet.definition.name}
            >
              <ul className="flex flex-col gap-2.5">
                {facet.options.map((option) => {
                  const active =
                    attributeFilters[facet.definition.key]?.includes(
                      option.value,
                    ) ?? false;
                  return (
                    <SidebarItem
                      key={option.value}
                      href={buildAttributeHref(
                        paramsWithoutPage,
                        facet.definition.key,
                        option.value,
                        active,
                      )}
                      active={active}
                      count={option.count}
                    >
                      {option.value}
                    </SidebarItem>
                  );
                })}
              </ul>
            </SidebarGroup>
          ))}
        </aside>

        {/* Results */}
        <div>
          {hasActiveFilters ? (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {query ? (
                <FilterTag
                  label={`“${query}”`}
                  removeHref={buildQueryHref(
                    (() => {
                      const p = new URLSearchParams(paramsWithoutPage);
                      p.delete("q");
                      return p;
                    })(),
                  )}
                />
              ) : null}
              {productType ? (
                <FilterTag
                  label={productType}
                  removeHref={buildTypeHref(paramsWithoutPage, null)}
                />
              ) : null}
              {(minPriceUsd !== undefined || maxPriceUsd !== undefined) ? (
                <FilterTag
                  label={`${minPriceUsd !== undefined ? `$${minPriceUsd}` : "$0"}–${maxPriceUsd !== undefined ? `$${maxPriceUsd}` : "∞"}`}
                  removeHref={buildQueryHref(
                    (() => {
                      const p = new URLSearchParams(paramsWithoutPage);
                      p.delete("min");
                      p.delete("max");
                      return p;
                    })(),
                  )}
                />
              ) : null}
              {sort !== "newest" ? (
                <FilterTag
                  label={sort.replace("_", " ")}
                  removeHref={buildQueryHref(
                    (() => {
                      const p = new URLSearchParams(paramsWithoutPage);
                      p.delete("sort");
                      return p;
                    })(),
                  )}
                />
              ) : null}
              {Object.entries(attributeFilters).flatMap(([key, values]) => {
                const name =
                  facets.find((facet) => facet.definition.key === key)
                    ?.definition.name ?? key;
                return values.map((value) => (
                  <FilterTag
                    key={`${key}:${value}`}
                    label={`${name}: ${value}`}
                    removeHref={buildAttributeHref(
                      paramsWithoutPage,
                      key,
                      value,
                      true,
                    )}
                  />
                ));
              })}
              <Link
                href="/products"
                className="ml-1 text-[12px] tracking-[0.04em] text-ink-soft underline underline-offset-2"
              >
                Clear all
              </Link>
            </div>
          ) : null}

          {catalog.rows.length > 0 ? (
            <div className="grid grid-cols-3 gap-x-7 gap-y-12 max-[1100px]:grid-cols-2 max-[560px]:grid-cols-1">
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
                    secondaryImage={
                      secondaryImage ?? primaryImage ?? "/vercel.svg"
                    }
                  />
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border border-(--line-soft) bg-paper-2/40 p-10 text-center">
              <p className="font-serif text-2xl text-ink">
                {hasActiveFilters
                  ? "No pieces match these filters."
                  : "The archive is being prepared."}
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                {hasActiveFilters
                  ? "Try widening your search or clearing a filter."
                  : "Publish products in the admin dashboard to populate this page."}
              </p>
              {hasActiveFilters ? (
                <Link
                  href="/products"
                  className="mt-5 inline-flex rounded-full bg-ink px-5 py-2.5 text-[12px] uppercase tracking-[0.14em] text-paper hover:bg-ink-soft"
                >
                  Clear filters
                </Link>
              ) : null}
            </div>
          )}

          {catalog.totalPages > 1 ? (
            <nav
              aria-label="Product listing pages"
              className="mt-15 flex items-center justify-center gap-1.5"
            >
              {catalog.hasPreviousPage ? (
                <Link
                  href={buildPageHref(
                    paramsWithoutPage,
                    Math.max(1, catalog.page - 1),
                  )}
                  className="inline-flex h-10 items-center rounded-full border border-(--line) px-4 text-[13px] text-ink-soft hover:bg-paper-2"
                >
                  ← Prev
                </Link>
              ) : (
                <span className="inline-flex h-10 cursor-not-allowed items-center rounded-full border border-(--line) px-4 text-[13px] text-ink-mute opacity-60">
                  ← Prev
                </span>
              )}

              {pageNumbers.map((pageNumber) => {
                const isActive = pageNumber === catalog.page;
                return (
                  <Link
                    key={pageNumber}
                    href={buildPageHref(paramsWithoutPage, pageNumber)}
                    aria-current={isActive ? "page" : undefined}
                    className={`grid h-10 w-10 place-items-center rounded-full text-[13px] ${
                      isActive
                        ? "bg-ink text-paper"
                        : "text-ink-soft hover:bg-paper-2"
                    }`}
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
                  className="inline-flex h-10 items-center rounded-full border border-(--line) px-4 text-[13px] text-ink-soft hover:bg-paper-2"
                >
                  Next →
                </Link>
              ) : (
                <span className="inline-flex h-10 cursor-not-allowed items-center rounded-full border border-(--line) px-4 text-[13px] text-ink-mute opacity-60">
                  Next →
                </span>
              )}
            </nav>
          ) : null}
        </div>
      </div>

      {/* Value strip */}
      <section className="border-t border-(--line-soft) bg-paper-2 py-15">
        <div className="container-page grid grid-cols-4 gap-8 max-md:grid-cols-2">
          <Value
            title="Lifetime authenticity"
            body="Every piece arrives with a signed certificate and the artist's letter."
            icon={
              <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Zm-3 10 2 2 4-4" />
            }
          />
          <Value
            title="Carbon-neutral shipping"
            body="Hand-rolled in silk, sealed in archival tube, delivered in 7–10 days."
            icon={<path d="M3 7h18M3 12h18M3 17h12" />}
          />
          <Value
            title="30-day returns"
            body="If your piece doesn't speak to you, return it — no questions, no fee."
            icon={
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </>
            }
          />
          <Value
            title="Fair to artisans"
            body="Artists receive 60% of every sale — paid directly, no middlemen."
            icon={
              <>
                <path d="M20 12c0 4.4-3.6 8-8 8a8 8 0 0 1-7.6-5.5" />
                <path d="M4 12c0-4.4 3.6-8 8-8 3 0 5.6 1.6 7 4" />
                <path d="M16 4h4v4" />
              </>
            }
          />
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <b className="font-serif text-[22px] font-medium whitespace-nowrap text-ink">
        {value}
      </b>
      <span>{label}</span>
    </div>
  );
}

function SidebarGroup({
  title,
  children,
  first,
}: {
  title: string;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <div
      className={`border-b border-(--line-soft) ${first ? "pt-0" : "pt-6"} pb-6`}
    >
      <h4 className="mb-4 text-[11.5px] font-semibold uppercase tracking-[0.18em] text-ink">
        {title}
      </h4>
      {children}
    </div>
  );
}

function SidebarItem({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active?: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className={`flex items-center justify-between text-sm transition-colors ${
          active ? "font-medium text-ink" : "text-ink-soft hover:text-ink"
        }`}
      >
        <span className="flex items-center gap-1.5">
          {active ? <span className="text-saffron">·</span> : null}
          {children}
        </span>
        {count !== undefined ? (
          <span className="text-xs tracking-[0.04em] text-ink-mute">{count}</span>
        ) : null}
      </Link>
    </li>
  );
}

function FilterTag({
  label,
  removeHref,
}: {
  label: string;
  removeHref: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-(--line) bg-paper-2 px-3 py-1.5 text-[12px] tracking-[0.04em] text-ink-soft">
      {label}
      <Link
        href={removeHref}
        aria-label={`Remove ${label} filter`}
        className="opacity-60 hover:opacity-100"
      >
        ×
      </Link>
    </span>
  );
}

function Value({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3.5 grid h-9 w-9 place-items-center rounded-full bg-paper text-ink">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {icon}
        </svg>
      </div>
      <h5 className="mb-1.5 font-serif text-lg font-medium text-ink">{title}</h5>
      <p className="text-[13px] leading-[1.55] text-ink-soft">{body}</p>
    </div>
  );
}
