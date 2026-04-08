import Image from "next/image";

import {
  addProductImageAction,
  deleteProductImageAction,
  moveProductImageDownAction,
  moveProductImageUpAction,
  updateProductImageMetaAction,
} from "./actions";

import { resolveUrl } from "@/lib/storage";

type ProductImageManagerProps = {
  productId: string;
  variants: Array<{
    id: string;
    title: string;
    sku: string | null;
  }>;
  images: Array<{
    id: string;
    variantId: string | null;
    bucket: string;
    path: string;
    altText: string | null;
    position: number;
  }>;
};

export function ProductImageManager({
  productId,
  variants,
  images,
}: ProductImageManagerProps) {
  const addImage = addProductImageAction.bind(null, productId);
  const updateImageMeta = updateProductImageMetaAction.bind(null, productId);
  const moveImageUp = moveProductImageUpAction.bind(null, productId);
  const moveImageDown = moveProductImageDownAction.bind(null, productId);
  const deleteImage = deleteProductImageAction.bind(null, productId);

  return (
    <section className="space-y-4 rounded border border-zinc-200 bg-white p-5">
      <div>
        <h3 className="text-lg font-semibold text-zinc-900">Product images</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Upload images, assign them to variants, reorder display positions, and
          remove outdated media.
        </p>
      </div>

      <form
        action={addImage}
        className="space-y-3 rounded border border-zinc-200 bg-zinc-50 p-4"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-[0.06em] text-zinc-600">
              Image file
            </span>
            <input
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="block w-full rounded border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-[0.06em] text-zinc-600">
              Assign variant
            </span>
            <select
              name="variantId"
              defaultValue=""
              className="h-10 w-full rounded border border-zinc-300 bg-white px-2 text-sm text-zinc-900"
            >
              <option value="">Unassigned (shared image)</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.title}
                  {variant.sku ? ` (${variant.sku})` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.06em] text-zinc-600">
            Alt text
          </span>
          <input
            name="altText"
            maxLength={220}
            placeholder="Describe the image for accessibility"
            className="h-10 w-full rounded border border-zinc-300 bg-white px-2 text-sm text-zinc-900"
          />
        </label>

        <button
          type="submit"
          className="inline-flex h-9 items-center rounded bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Upload image
        </button>
      </form>

      {images.length > 0 ? (
        <div className="space-y-3">
          {images.map((image) => {
            const publicUrl = resolveUrl({
              bucket: image.bucket,
              path: image.path,
            });

            return (
              <div
                key={image.id}
                className="grid gap-3 rounded border border-zinc-200 p-3 md:grid-cols-[160px_1fr]"
              >
                <div className="relative aspect-square overflow-hidden rounded border border-zinc-200 bg-zinc-50">
                  {publicUrl ? (
                    <Image
                      src={publicUrl}
                      alt={image.altText ?? "Product image"}
                      fill
                      sizes="160px"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center px-2 text-center text-xs text-zinc-500">
                      Preview unavailable
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-zinc-500">
                    Position {image.position} • {image.bucket}/{image.path}
                  </p>

                  <form
                    action={updateImageMeta}
                    className="grid gap-3 md:grid-cols-[1fr_220px_auto]"
                  >
                    <input type="hidden" name="imageId" value={image.id} />

                    <input
                      name="altText"
                      defaultValue={image.altText ?? ""}
                      maxLength={220}
                      placeholder="Alt text"
                      className="h-9 rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                    />

                    <select
                      name="variantId"
                      defaultValue={image.variantId ?? ""}
                      className="h-9 rounded border border-zinc-300 px-2 text-sm text-zinc-900"
                    >
                      <option value="">Unassigned</option>
                      {variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.title}
                          {variant.sku ? ` (${variant.sku})` : ""}
                        </option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      className="inline-flex h-9 items-center justify-center rounded border border-zinc-300 px-3 text-xs font-medium uppercase tracking-[0.06em] text-zinc-700 hover:bg-zinc-100"
                    >
                      Save
                    </button>
                  </form>

                  <div className="flex items-center gap-2">
                    <form action={moveImageUp}>
                      <input type="hidden" name="imageId" value={image.id} />
                      <button
                        type="submit"
                        className="inline-flex h-8 items-center rounded border border-zinc-300 px-3 text-xs font-medium uppercase tracking-[0.06em] text-zinc-700 hover:bg-zinc-100"
                      >
                        Move up
                      </button>
                    </form>

                    <form action={moveImageDown}>
                      <input type="hidden" name="imageId" value={image.id} />
                      <button
                        type="submit"
                        className="inline-flex h-8 items-center rounded border border-zinc-300 px-3 text-xs font-medium uppercase tracking-[0.06em] text-zinc-700 hover:bg-zinc-100"
                      >
                        Move down
                      </button>
                    </form>

                    <form action={deleteImage}>
                      <input type="hidden" name="imageId" value={image.id} />
                      <button
                        type="submit"
                        className="inline-flex h-8 items-center rounded border border-rose-200 px-3 text-xs font-medium uppercase tracking-[0.06em] text-rose-700 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
          No images uploaded yet.
        </p>
      )}
    </section>
  );
}
