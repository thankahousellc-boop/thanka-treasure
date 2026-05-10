import Image from "next/image";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  RichTextEditor,
  Select,
  Textarea,
} from "@/components/admin/ui";

type BlogPostStatus = "draft" | "published" | "scheduled";

type BlogPostFormValues = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImageAlt: string;
  featuredImageUrl: string;
  status: BlogPostStatus;
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

function statusTone(status: BlogPostStatus): "success" | "warning" | "info" {
  if (status === "published") return "success";
  if (status === "scheduled") return "info";
  return "warning";
}

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
    <form action={action} className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className="admin-display text-2xl font-semibold"
              style={{ color: "var(--admin-text)" }}
            >
              {title}
            </h2>
            <Badge tone={statusTone(values.status)}>{values.status}</Badge>
          </div>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--admin-text-soft)" }}
          >
            {description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="primary" size="md">
            {submitLabel}
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 min-w-0">
          <Card>
            <CardHeader
              title="Basics"
              description="Title, slug, and excerpt shown on the storefront."
            />
            <CardBody className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <Field
                  className="md:col-span-2"
                  label="Title"
                  hint="Shown to readers and used to build the URL slug."
                >
                  <Input
                    name="title"
                    required
                    defaultValue={values.title}
                    placeholder="A guide to choosing your first thangka"
                  />
                </Field>
                <Field label="Slug" hint="Leave blank to auto-generate.">
                  <Input
                    name="slug"
                    defaultValue={values.slug}
                    placeholder="choosing-your-first-thangka"
                  />
                </Field>
              </div>

              <Field
                label="Excerpt"
                hint="Optional short summary used in cards and SEO previews."
              >
                <Textarea
                  name="excerpt"
                  rows={2}
                  defaultValue={values.excerpt}
                  placeholder="A short blurb that appears alongside this post."
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Content"
              description="Format with the toolbar — headings, lists, quotes, code, and inline images are supported."
            />
            <CardBody>
              <RichTextEditor
                name="content"
                initialValue={values.content}
                upload={{ bucket: "blog-images", target: "blog-inline" }}
              />
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Publishing" />
            <CardBody className="space-y-3">
              <Field label="Status">
                <Select name="status" defaultValue={values.status}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                </Select>
              </Field>
              <Field
                label="Scheduled at"
                hint="Required when status is Scheduled."
              >
                <Input
                  name="scheduledAt"
                  type="datetime-local"
                  defaultValue={values.scheduledAt}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Featured image" />
            <CardBody className="space-y-3">
              {values.featuredImageUrl ? (
                <div
                  className="relative h-32 w-full overflow-hidden rounded-md"
                  style={{
                    border: "1px solid var(--admin-border)",
                    backgroundColor: "var(--admin-surface-2)",
                  }}
                >
                  <Image
                    src={values.featuredImageUrl}
                    alt={values.featuredImageAlt || "Featured image preview"}
                    fill
                    sizes="320px"
                    className="object-cover"
                  />
                </div>
              ) : null}

              <Field
                label="Upload"
                hint="JPEG, PNG, or WEBP. Max 5MB."
              >
                <input
                  name="featuredImage"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="block w-full text-xs"
                  style={{ color: "var(--admin-text-soft)" }}
                />
              </Field>

              <Field label="Alt text">
                <Input
                  name="featuredImageAlt"
                  defaultValue={values.featuredImageAlt}
                  placeholder="Describe the image"
                />
              </Field>

              {values.featuredImageUrl ? (
                <label
                  className="inline-flex items-center gap-2 text-xs"
                  style={{ color: "var(--admin-text-soft)" }}
                >
                  <input
                    type="checkbox"
                    name="removeFeaturedImage"
                    value="1"
                    className="h-4 w-4 rounded"
                    style={{ borderColor: "var(--admin-border-strong)" }}
                  />
                  Remove existing image
                </label>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Organization" />
            <CardBody className="space-y-3">
              <Field
                label="Categories"
                hint="Cmd/Ctrl-click for multiple."
              >
                <Select
                  name="categoryIds"
                  multiple
                  defaultValue={values.categoryIds}
                  className="min-h-24 py-1.5"
                >
                  {categories.length > 0 ? (
                    categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))
                  ) : (
                    <option disabled value="">
                      No categories
                    </option>
                  )}
                </Select>
              </Field>
              <Field label="Tags">
                <Select
                  name="tagIds"
                  multiple
                  defaultValue={values.tagIds}
                  className="min-h-24 py-1.5"
                >
                  {tags.length > 0 ? (
                    tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))
                  ) : (
                    <option disabled value="">
                      No tags
                    </option>
                  )}
                </Select>
              </Field>
            </CardBody>
          </Card>
        </aside>
      </div>

      <div
        className="sticky bottom-3 grid items-center gap-4 rounded-md px-4 py-3 lg:grid-cols-[minmax(0,1fr)_320px]"
        style={{
          background: "var(--admin-surface)",
          border: "1px solid var(--admin-border)",
          boxShadow: "var(--admin-shadow-lg)",
        }}
      >
        <span className="text-xs" style={{ color: "var(--admin-text-mute)" }}>
          The URL slug is generated from the title when left blank.
        </span>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="md">
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
