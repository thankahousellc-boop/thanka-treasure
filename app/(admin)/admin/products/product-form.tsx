import {
  ProductVariantBuilder,
  type ProductVariantFormValue,
} from "./product-variant-builder";
import { ProductDescriptionEditor } from "./product-description-editor";

type ProductFormValues = {
  title: string;
  slug: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  status: "draft" | "active" | "archived";
  productType: string;
  vendor: string;
  tags: string;
  variants: ProductVariantFormValue[];
};

type ProductFormProps = {
  title: string;
  description: string;
  submitLabel: string;
  values: ProductFormValues;
  action: (formData: FormData) => Promise<void>;
};

export function ProductForm({
  title,
  description,
  submitLabel,
  values,
  action,
}: ProductFormProps) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">{title}</h2>
        <p className="mt-1 text-sm text-zinc-600">{description}</p>
      </div>

      <form
        action={action}
        className="space-y-6 rounded border border-zinc-200 bg-white p-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Title</span>
            <input
              name="title"
              required
              defaultValue={values.title}
              className="h-10 w-full rounded border border-zinc-300 px-3 text-sm text-zinc-900"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Slug</span>
            <input
              name="slug"
              defaultValue={values.slug}
              className="h-10 w-full rounded border border-zinc-300 px-3 text-sm text-zinc-900"
            />
            <span className="text-xs text-zinc-500">
              Leave blank to generate from title.
            </span>
          </label>
        </div>

        <div className="block space-y-1">
          <span className="text-sm font-medium text-zinc-700">Description</span>
          <ProductDescriptionEditor
            name="description"
            initialValue={values.description}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">
              Meta title
            </span>
            <input
              name="metaTitle"
              defaultValue={values.metaTitle}
              className="h-10 w-full rounded border border-zinc-300 px-3 text-sm text-zinc-900"
            />
            <span className="text-xs text-zinc-500">
              Recommended up to 60-70 characters.
            </span>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">
              Meta description
            </span>
            <textarea
              name="metaDescription"
              rows={3}
              defaultValue={values.metaDescription}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
            <span className="text-xs text-zinc-500">
              Recommended up to 150-160 characters.
            </span>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Status</span>
            <select
              name="status"
              defaultValue={values.status}
              className="h-10 w-full rounded border border-zinc-300 px-3 text-sm text-zinc-900"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">
              Product type
            </span>
            <input
              name="productType"
              defaultValue={values.productType}
              className="h-10 w-full rounded border border-zinc-300 px-3 text-sm text-zinc-900"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Vendor</span>
            <input
              name="vendor"
              defaultValue={values.vendor}
              className="h-10 w-full rounded border border-zinc-300 px-3 text-sm text-zinc-900"
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-700">Tags</span>
          <input
            name="tags"
            defaultValue={values.tags}
            placeholder="thangka, hand-painted, buddhist"
            className="h-10 w-full rounded border border-zinc-300 px-3 text-sm text-zinc-900"
          />
          <span className="text-xs text-zinc-500">
            Separate tags with commas.
          </span>
        </label>

        <ProductVariantBuilder initialVariants={values.variants} />

        <button
          type="submit"
          className="inline-flex h-10 items-center rounded bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700"
        >
          {submitLabel}
        </button>
      </form>
    </section>
  );
}
