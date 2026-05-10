import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Icon,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "@/components/admin/ui";
import { collectionRepository } from "@/lib/repositories/collection-repository";

import {
  createProductCategoryAction,
  createProductCollectionAction,
  updateCollectionProductsAction,
  updateProductCategoryAction,
  updateProductCollectionAction,
} from "./actions";

export const dynamic = "force-dynamic";

type CollectionWithProductIds = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  type: string;
  imageBucket: string | null;
  imagePath: string | null;
  updatedAt: Date;
  createdAt: Date;
  productCount: number;
  productIds: string[];
};

async function loadTaxonomyForAdmin() {
  try {
    const [categories, collections, products] = await Promise.all([
      collectionRepository.listCategoriesForAdmin(),
      collectionRepository.listCollectionsForAdmin(),
      collectionRepository.listProductsForCollectionAdmin(400),
    ]);

    const links = await collectionRepository.listCollectionProductLinksForAdmin(
      collections.map((collection) => collection.id),
    );

    const productIdsByCollectionId = new Map<string, string[]>();
    for (const link of links) {
      const current = productIdsByCollectionId.get(link.collectionId) ?? [];
      current.push(link.productId);
      productIdsByCollectionId.set(link.collectionId, current);
    }

    const collectionsWithProductIds: CollectionWithProductIds[] =
      collections.map((collection) => ({
        ...collection,
        productIds: productIdsByCollectionId.get(collection.id) ?? [],
      }));

    return {
      categories,
      collections: collectionsWithProductIds,
      products,
    };
  } catch {
    return {
      categories: [] as Awaited<
        ReturnType<typeof collectionRepository.listCategoriesForAdmin>
      >,
      collections: [] as CollectionWithProductIds[],
      products: [] as Awaited<
        ReturnType<typeof collectionRepository.listProductsForCollectionAdmin>
      >,
    };
  }
}

export default async function AdminProductTaxonomyPage() {
  const { categories, collections, products } = await loadTaxonomyForAdmin();

  return (
    <>
      <PageHeader
        title="Categories & collections"
        description="Categories drive product URLs and filters. Collections bundle products under curated themes."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        {/* CATEGORIES */}
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                Categories
                <Badge tone="muted">{categories.length}</Badge>
              </span>
            }
            description="Used in product URLs and filters."
          />
          <CardBody className="space-y-1 px-0 py-0">
            {categories.length === 0 ? (
              <InlineEmpty message="No categories yet — add your first one below." />
            ) : (
              <ul className="divide-y" style={{ borderColor: "var(--admin-border)" }}>
                {categories.map((category) => (
                  <li key={category.id}>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3 transition hover:bg-(--admin-surface-2)">
                        <Icon.ChevronRight
                          width={14}
                          height={14}
                          className="transition group-open:rotate-90"
                          style={{ color: "var(--admin-text-mute)" }}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-sm font-medium"
                            style={{ color: "var(--admin-text)" }}
                          >
                            {category.name}
                          </p>
                          <p
                            className="truncate text-[11px]"
                            style={{ color: "var(--admin-text-mute)" }}
                          >
                            /{category.slug}
                          </p>
                        </div>
                        <span
                          className="shrink-0 text-[11px]"
                          style={{ color: "var(--admin-text-mute)" }}
                        >
                          {category.productCount} product
                          {category.productCount === 1 ? "" : "s"}
                        </span>
                      </summary>
                      <form
                        action={updateProductCategoryAction}
                        className="space-y-3 border-t px-5 py-4"
                        style={{
                          borderColor: "var(--admin-border)",
                          background: "var(--admin-surface-2)",
                        }}
                      >
                        <input type="hidden" name="id" value={category.id} />
                        <div className="grid gap-3 md:grid-cols-2">
                          <Field label="Name">
                            <Input name="name" defaultValue={category.name} required />
                          </Field>
                          <Field label="Slug">
                            <Input name="slug" defaultValue={category.slug} />
                          </Field>
                        </div>
                        <div className="grid gap-3 md:grid-cols-[1fr_120px]">
                          <Field label="Description">
                            <Input
                              name="description"
                              defaultValue={category.description ?? ""}
                            />
                          </Field>
                          <Field label="Position">
                            <Input
                              name="position"
                              type="number"
                              min={0}
                              defaultValue={category.position}
                            />
                          </Field>
                        </div>
                        <div className="flex justify-end">
                          <Button type="submit" size="sm">
                            Save changes
                          </Button>
                        </div>
                      </form>
                    </details>
                  </li>
                ))}
              </ul>
            )}

            <InlineCreateForm
              kind="category"
              action={createProductCategoryAction}
            />
          </CardBody>
        </Card>

        {/* COLLECTIONS */}
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                Collections
                <Badge tone="muted">{collections.length}</Badge>
              </span>
            }
            description="Bundle products under curated themes."
          />
          <CardBody className="space-y-1 px-0 py-0">
            {collections.length === 0 ? (
              <InlineEmpty message="No collections yet — create your first one below." />
            ) : (
              <ul
                className="divide-y"
                style={{ borderColor: "var(--admin-border)" }}
              >
                {collections.map((collection) => (
                  <li key={collection.id}>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3 transition hover:bg-(--admin-surface-2)">
                        <Icon.ChevronRight
                          width={14}
                          height={14}
                          className="transition group-open:rotate-90"
                          style={{ color: "var(--admin-text-mute)" }}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-sm font-medium"
                            style={{ color: "var(--admin-text)" }}
                          >
                            {collection.title}
                          </p>
                          <p
                            className="truncate text-[11px]"
                            style={{ color: "var(--admin-text-mute)" }}
                          >
                            /{collection.slug} · {collection.type}
                          </p>
                        </div>
                        <span
                          className="shrink-0 text-[11px]"
                          style={{ color: "var(--admin-text-mute)" }}
                        >
                          {collection.productCount} product
                          {collection.productCount === 1 ? "" : "s"}
                        </span>
                      </summary>
                      <div
                        className="space-y-4 border-t px-5 py-4"
                        style={{
                          borderColor: "var(--admin-border)",
                          background: "var(--admin-surface-2)",
                        }}
                      >
                        <form
                          action={updateProductCollectionAction}
                          className="space-y-3"
                        >
                          <input type="hidden" name="id" value={collection.id} />
                          <input
                            type="hidden"
                            name="oldSlug"
                            value={collection.slug}
                          />
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label="Title">
                              <Input
                                name="title"
                                defaultValue={collection.title}
                                required
                              />
                            </Field>
                            <Field label="Slug">
                              <Input name="slug" defaultValue={collection.slug} />
                            </Field>
                          </div>
                          <div className="grid gap-3 md:grid-cols-[1fr_140px]">
                            <Field label="Description">
                              <Input
                                name="description"
                                defaultValue={collection.description ?? ""}
                              />
                            </Field>
                            <Field label="Type">
                              <Select name="type" defaultValue={collection.type}>
                                <option value="manual">Manual</option>
                                <option value="automated">Automated</option>
                              </Select>
                            </Field>
                          </div>
                          <div className="flex justify-end">
                            <Button type="submit" size="sm">
                              Save details
                            </Button>
                          </div>
                        </form>

                        <form
                          action={updateCollectionProductsAction}
                          className="space-y-3 border-t pt-4"
                          style={{ borderColor: "var(--admin-border)" }}
                        >
                          <input
                            type="hidden"
                            name="collectionId"
                            value={collection.id}
                          />
                          <input
                            type="hidden"
                            name="collectionSlug"
                            value={collection.slug}
                          />
                          <Field
                            label="Products in collection"
                            hint="Hold ⌘ / Ctrl to select multiple."
                          >
                            <Select
                              name="productIds"
                              multiple
                              defaultValue={collection.productIds}
                              className="min-h-32"
                            >
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.title} ({product.status})
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <div className="flex justify-end">
                            <Button type="submit" variant="secondary" size="sm">
                              Save products
                            </Button>
                          </div>
                        </form>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}

            <InlineCreateForm
              kind="collection"
              action={createProductCollectionAction}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function InlineEmpty({ message }: { message: string }) {
  return (
    <p
      className="px-5 py-4 text-xs"
      style={{ color: "var(--admin-text-mute)" }}
    >
      {message}
    </p>
  );
}

function InlineCreateForm({
  kind,
  action,
}: {
  kind: "category" | "collection";
  action: (formData: FormData) => Promise<void>;
}) {
  const labels =
    kind === "category"
      ? {
          summary: "New category",
          name: "Name",
          slug: "Slug",
          extra: "Position",
          extraDefault: "0",
          submit: "Add category",
        }
      : {
          summary: "New collection",
          name: "Title",
          slug: "Slug",
          extra: "Type",
          extraDefault: "manual",
          submit: "Add collection",
        };

  return (
    <details
      className="group border-t"
      style={{ borderColor: "var(--admin-border)" }}
    >
      <summary
        className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm font-medium transition hover:bg-(--admin-surface-2)"
        style={{ color: "var(--admin-accent)" }}
      >
        <Icon.Plus width={14} height={14} />
        {labels.summary}
      </summary>
      <form
        action={action}
        className="space-y-3 border-t px-5 py-4"
        style={{
          borderColor: "var(--admin-border)",
          background: "var(--admin-surface-2)",
        }}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={labels.name}>
            <Input
              name={kind === "category" ? "name" : "title"}
              required
              placeholder={
                kind === "category" ? "e.g. Buddhas" : "e.g. Bestsellers"
              }
            />
          </Field>
          <Field label={labels.slug} hint="Optional. Generated when blank.">
            <Input
              name="slug"
              placeholder={kind === "category" ? "buddhas" : "bestsellers"}
            />
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_140px]">
          <Field label="Description">
            {kind === "category" ? (
              <Input name="description" placeholder="Optional summary" />
            ) : (
              <Textarea
                name="description"
                rows={2}
                placeholder="Optional summary"
              />
            )}
          </Field>
          <Field label={labels.extra}>
            {kind === "category" ? (
              <Input
                name="position"
                type="number"
                min={0}
                defaultValue={labels.extraDefault}
              />
            ) : (
              <Select name="type" defaultValue={labels.extraDefault}>
                <option value="manual">Manual</option>
                <option value="automated">Automated</option>
              </Select>
            )}
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm">
            {labels.submit}
          </Button>
        </div>
      </form>
    </details>
  );
}
