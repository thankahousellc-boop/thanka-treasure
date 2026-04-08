import Link from "next/link";

import { collectionRepository } from "@/lib/repositories/collection-repository";

import {
  createProductCategoryAction,
  createProductCollectionAction,
  updateCollectionProductsAction,
  updateProductCategoryAction,
  updateProductCollectionAction,
} from "./actions";

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
    <section className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">
            Manage product taxonomy
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Maintain category slugs and curate manual collections with product
            assignment.
          </p>
        </div>

        <Link
          href="/admin/products"
          className="inline-flex h-10 items-center rounded border border-zinc-300 px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
        >
          Back to products
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-4 rounded border border-zinc-200 bg-white p-5">
          <h3 className="text-base font-semibold text-zinc-900">Categories</h3>

          <form action={createProductCategoryAction} className="space-y-3">
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
                  action={updateProductCategoryAction}
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
                    Referenced by {category.productCount} product
                    {category.productCount === 1 ? "" : "s"}.
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
          <h3 className="text-base font-semibold text-zinc-900">Collections</h3>

          <form action={createProductCollectionAction} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                name="title"
                placeholder="Title"
                required
                className="h-10 rounded border border-zinc-300 px-3 text-sm text-zinc-900"
              />
              <input
                name="slug"
                placeholder="Slug (optional)"
                className="h-10 rounded border border-zinc-300 px-3 text-sm text-zinc-900"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_160px]">
              <input
                name="description"
                placeholder="Description (optional)"
                className="h-10 rounded border border-zinc-300 px-3 text-sm text-zinc-900"
              />
              <select
                name="type"
                defaultValue="manual"
                className="h-10 rounded border border-zinc-300 px-3 text-sm text-zinc-900"
              >
                <option value="manual">Manual</option>
                <option value="automated">Automated</option>
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex h-9 items-center rounded bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Add collection
            </button>
          </form>

          {collections.length > 0 ? (
            <div className="space-y-3">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className="space-y-3 rounded border border-zinc-200 p-3"
                >
                  <form
                    action={updateProductCollectionAction}
                    className="space-y-2"
                  >
                    <input type="hidden" name="id" value={collection.id} />
                    <input
                      type="hidden"
                      name="oldSlug"
                      value={collection.slug}
                    />

                    <div className="grid gap-2 md:grid-cols-2">
                      <input
                        name="title"
                        defaultValue={collection.title}
                        required
                        className="h-9 rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                      />
                      <input
                        name="slug"
                        defaultValue={collection.slug}
                        className="h-9 rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                      />
                    </div>

                    <div className="grid gap-2 md:grid-cols-[1fr_140px_auto]">
                      <input
                        name="description"
                        defaultValue={collection.description ?? ""}
                        placeholder="Description"
                        className="h-9 rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                      />
                      <select
                        name="type"
                        defaultValue={collection.type}
                        className="h-9 rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                      >
                        <option value="manual">Manual</option>
                        <option value="automated">Automated</option>
                      </select>
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center justify-center rounded border border-zinc-300 px-3 text-xs font-medium uppercase tracking-[0.06em] text-zinc-700 hover:bg-zinc-100"
                      >
                        Save
                      </button>
                    </div>
                  </form>

                  <form
                    action={updateCollectionProductsAction}
                    className="space-y-2"
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

                    <label className="block space-y-1">
                      <span className="text-xs font-medium uppercase tracking-[0.06em] text-zinc-600">
                        Products in collection
                      </span>
                      <select
                        name="productIds"
                        multiple
                        defaultValue={collection.productIds}
                        className="min-h-40 w-full rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900"
                      >
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.title} ({product.status})
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-zinc-500">
                        {collection.productCount} product
                        {collection.productCount === 1 ? "" : "s"} assigned.
                      </p>
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center rounded border border-zinc-300 px-3 text-xs font-medium uppercase tracking-[0.06em] text-zinc-700 hover:bg-zinc-100"
                      >
                        Save products
                      </button>
                    </div>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
              No collections yet.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
