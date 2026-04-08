import Image from "next/image";

import { BlogContentEditor } from "./blog-content-editor";

type BlogPostFormValues = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImageAlt: string;
  featuredImageUrl: string;
  status: "draft" | "published" | "scheduled";
  scheduledAt: string;
  categoryIds: string[];
  tagIds: string[];
};

type BlogTaxonomyOption = {
  id: string;
  name: string;
  slug: string;
};

type BlogPostFormProps = {
  title: string;
  description: string;
  submitLabel: string;
  values: BlogPostFormValues;
  categories: BlogTaxonomyOption[];
  tags: BlogTaxonomyOption[];
  action: (formData: FormData) => Promise<void>;
};

export function BlogPostForm({
  title,
  description,
  submitLabel,
  values,
  categories,
  tags,
  action,
}: BlogPostFormProps) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">{title}</h2>
        <p className="mt-1 text-sm text-zinc-600">{description}</p>
      </div>

      <form
        action={action}
        className="space-y-4 rounded border border-zinc-200 bg-white p-5"
      >
        <div className="space-y-1">
          <label htmlFor="title" className="text-sm font-medium text-zinc-700">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            defaultValue={values.title}
            className="h-10 w-full rounded border border-zinc-300 px-3 text-sm text-zinc-900"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="slug" className="text-sm font-medium text-zinc-700">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            defaultValue={values.slug}
            className="h-10 w-full rounded border border-zinc-300 px-3 text-sm text-zinc-900"
          />
          <p className="text-xs text-zinc-500">
            Leave blank to generate from title.
          </p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="excerpt"
            className="text-sm font-medium text-zinc-700"
          >
            Excerpt
          </label>
          <textarea
            id="excerpt"
            name="excerpt"
            defaultValue={values.excerpt}
            rows={3}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="content"
            className="text-sm font-medium text-zinc-700"
          >
            Content
          </label>
          <BlogContentEditor name="content" initialValue={values.content} />
        </div>

        <div className="space-y-2 rounded border border-zinc-200 bg-zinc-50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-700">
            Featured Image
          </h3>

          {values.featuredImageUrl ? (
            <div className="relative h-56 w-full overflow-hidden rounded border border-zinc-200 bg-zinc-100">
              <Image
                src={values.featuredImageUrl}
                alt={values.featuredImageAlt || "Featured image preview"}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No featured image selected.</p>
          )}

          <div className="space-y-1">
            <label
              htmlFor="featuredImage"
              className="text-sm font-medium text-zinc-700"
            >
              Upload image
            </label>
            <input
              id="featuredImage"
              name="featuredImage"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="block w-full text-sm text-zinc-700"
            />
            <p className="text-xs text-zinc-500">
              JPEG, PNG, or WEBP. Maximum file size 5MB.
            </p>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="featuredImageAlt"
              className="text-sm font-medium text-zinc-700"
            >
              Alt text
            </label>
            <input
              id="featuredImageAlt"
              name="featuredImageAlt"
              defaultValue={values.featuredImageAlt}
              className="h-10 w-full rounded border border-zinc-300 px-3 text-sm text-zinc-900"
            />
          </div>

          {values.featuredImageUrl ? (
            <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                name="removeFeaturedImage"
                value="1"
                className="h-4 w-4 rounded border-zinc-300"
              />
              Remove existing featured image
            </label>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="status"
              className="text-sm font-medium text-zinc-700"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={values.status}
              className="h-10 w-full rounded border border-zinc-300 px-3 text-sm text-zinc-900"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="scheduledAt"
              className="text-sm font-medium text-zinc-700"
            >
              Scheduled At
            </label>
            <input
              id="scheduledAt"
              name="scheduledAt"
              type="datetime-local"
              defaultValue={values.scheduledAt}
              className="h-10 w-full rounded border border-zinc-300 px-3 text-sm text-zinc-900"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="categoryIds"
              className="text-sm font-medium text-zinc-700"
            >
              Categories
            </label>
            <select
              id="categoryIds"
              name="categoryIds"
              multiple
              defaultValue={values.categoryIds}
              className="min-h-32 w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            >
              {categories.length > 0 ? (
                categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))
              ) : (
                <option disabled value="">
                  No categories available
                </option>
              )}
            </select>
            <p className="text-xs text-zinc-500">
              Hold Cmd/Ctrl to select multiple categories.
            </p>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="tagIds"
              className="text-sm font-medium text-zinc-700"
            >
              Tags
            </label>
            <select
              id="tagIds"
              name="tagIds"
              multiple
              defaultValue={values.tagIds}
              className="min-h-32 w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            >
              {tags.length > 0 ? (
                tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))
              ) : (
                <option disabled value="">
                  No tags available
                </option>
              )}
            </select>
            <p className="text-xs text-zinc-500">
              Create new tags from taxonomy management if needed.
            </p>
          </div>
        </div>

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
