import {
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  Icon,
} from "@/components/admin/ui";
import { productRepository } from "@/lib/repositories/product-repository";

import { ProductsTable } from "./products-table";

async function loadProductsForAdmin() {
  try {
    return await productRepository.listForAdmin(200);
  } catch {
    return [];
  }
}

export default async function AdminProductsPage() {
  const products = await loadProductsForAdmin();

  const activeCount = products.filter((p) => p.status === "active").length;
  const draftCount = products.filter((p) => p.status === "draft").length;
  const archivedCount = products.filter(
    (p) => p.status === "archived",
  ).length;

  return (
    <section className="space-y-5">
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
        {products.length > 0 ? (
          <ProductsTable rows={products} />
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
