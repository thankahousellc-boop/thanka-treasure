import {
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  Icon,
} from "@/components/admin/ui";
import { FlashToast } from "@/components/admin/flash-toast";
import { attributeRepository } from "@/lib/repositories/attribute-repository";
import { productRepository } from "@/lib/repositories/product-repository";

import { ProductsFilterBar } from "./products-filter-bar";
import { ProductsTable } from "./products-table";

type AdminSearchParams = Record<string, string | string[] | undefined>;

// Dynamic attribute filters arrive as `?attr_<key>=value` (repeatable), matching
// the storefront facet contract. OR within a key, AND across keys.
function parseAttributeFilters(searchParams: AdminSearchParams) {
  const filters: Record<string, string[]> = {};
  for (const [rawKey, rawValue] of Object.entries(searchParams)) {
    if (!rawKey.startsWith("attr_")) continue;
    const key = rawKey.slice("attr_".length).trim();
    const values = (
      Array.isArray(rawValue) ? rawValue : rawValue ? [rawValue] : []
    )
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (key && values.length > 0) {
      filters[key] = values;
    }
  }
  return filters;
}

async function loadProductsForAdmin(attributes: Record<string, string[]>) {
  try {
    return await productRepository.listForAdmin({ limit: 200, attributes });
  } catch {
    return [];
  }
}

async function loadFilterFacets() {
  try {
    return await attributeRepository.listFacetsForAdmin();
  } catch {
    return [];
  }
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const attributeFilters = parseAttributeFilters(resolvedSearchParams);
  const hasActiveFilters = Object.keys(attributeFilters).length > 0;

  const [products, facets] = await Promise.all([
    loadProductsForAdmin(attributeFilters),
    loadFilterFacets(),
  ]);

  const activeCount = products.filter((p) => p.status === "active").length;
  const draftCount = products.filter((p) => p.status === "draft").length;
  const archivedCount = products.filter(
    (p) => p.status === "archived",
  ).length;

  return (
    <section className="space-y-5">
      <FlashToast
        messages={{
          "status-active": "Product published.",
          "status-draft": "Product moved to draft.",
          "status-archived": "Product archived.",
        }}
      />
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className="admin-display text-2xl font-semibold"
            style={{ color: "var(--admin-text)" }}
          >
            Manage products
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--admin-text-soft)" }}
          >
            Create, publish, and organize the catalog.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span style={{ color: "var(--admin-text-mute)" }}>
              {products.length} {products.length === 1 ? "product" : "products"}
              {hasActiveFilters ? " match filters" : ""}
            </span>
            {activeCount > 0 ? (
              <Badge tone="success">{activeCount} active</Badge>
            ) : null}
            {draftCount > 0 ? (
              <Badge tone="warning">{draftCount} draft</Badge>
            ) : null}
            {archivedCount > 0 ? (
              <Badge tone="muted">{archivedCount} archived</Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink
            href="/admin/products/inventory"
            variant="secondary"
            size="md"
          >
            <Icon.Layers />
            <span>Manage inventory</span>
          </ButtonLink>
          <ButtonLink
            href="/admin/products/import"
            variant="secondary"
            size="md"
          >
            <Icon.Upload />
            <span>Bulk import</span>
          </ButtonLink>
          <ButtonLink href="/admin/products/new" variant="primary" size="md">
            <Icon.Plus />
            <span>Add product</span>
          </ButtonLink>
        </div>
      </header>

      <Card>
        <CardHeader
          title="All products"
          description="Use the row menu to publish, move to draft, or archive."
        />
        <ProductsFilterBar facets={facets} active={attributeFilters} />
        {products.length > 0 ? (
          <ProductsTable rows={products} />
        ) : hasActiveFilters ? (
          <div className="px-5 py-5">
            <EmptyState
              icon={<Icon.Search width={28} height={28} />}
              title="No products match these filters."
              description="Try removing a filter, or clear them all to see the full catalog."
            />
          </div>
        ) : (
          <div className="px-5 py-5">
            <EmptyState
              icon={<Icon.Box width={28} height={28} />}
              title="No products yet."
              description="Add your first product to populate the storefront."
              action={
                <ButtonLink
                  href="/admin/products/new"
                  variant="primary"
                  size="sm"
                >
                  Create product
                </ButtonLink>
              }
            />
          </div>
        )}
      </Card>
    </section>
  );
}
