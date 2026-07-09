import {
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  Field,
  Icon,
  Input,
  PageHeader,
  SubmitButton,
  Textarea,
} from "@/components/admin/ui";
import { FlashToast } from "@/components/admin/flash-toast";
import { blogRepository } from "@/lib/repositories/blog-repository";

import {
  createCategoryAction,
  createTagAction,
  updateCategoryAction,
  updateTagAction,
} from "./actions";

async function loadTaxonomyForAdmin() {
  try {
    const [categories, tags] = await Promise.all([
      blogRepository.listCategoriesForAdmin(),
      blogRepository.listTagsForAdmin(),
    ]);

    return { categories, tags };
  } catch {
    return { categories: [], tags: [] };
  }
}

export default async function AdminBlogCategoriesPage() {
  const { categories, tags } = await loadTaxonomyForAdmin();

  return (
    <section className="space-y-5">
      <FlashToast
        messages={{
          "category-created": "Category created.",
          "category-saved": "Category saved.",
          "tag-created": "Tag created.",
          "tag-saved": "Tag saved.",
        }}
      />
      <PageHeader
        eyebrow="Content"
        title="Blog taxonomy"
        description="Create and maintain categories and tags used across blog posts."
        actions={
          <ButtonLink href="/admin/blog" variant="secondary">
            Back to posts
          </ButtonLink>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Categories"
            description="Used for top-level grouping. Position controls sort order."
          />
          <CardBody className="space-y-4">
            <form action={createCategoryAction} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Name">
                  <Input name="name" required placeholder="Care guides" />
                </Field>
                <Field label="Slug" hint="Leave blank to auto-generate.">
                  <Input name="slug" placeholder="care-guides" />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_120px]">
                <Field label="Description">
                  <Textarea
                    name="description"
                    rows={2}
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Position">
                  <Input name="position" type="number" min={0} defaultValue={0} />
                </Field>
              </div>

              <SubmitButton pendingLabel="Adding…">
                <Icon.Plus width={14} height={14} /> Add category
              </SubmitButton>
            </form>

            {categories.length > 0 ? (
              <div className="space-y-2">
                {categories.map((category) => (
                  <form
                    key={category.id}
                    action={updateCategoryAction}
                    className="space-y-2 rounded-md p-3"
                    style={{
                      border: "1px solid var(--admin-border)",
                      backgroundColor: "var(--admin-surface-2)",
                    }}
                  >
                    <input type="hidden" name="id" value={category.id} />

                    <div className="grid gap-2 md:grid-cols-2">
                      <Field label="Name">
                        <Input
                          name="name"
                          defaultValue={category.name}
                          required
                        />
                      </Field>
                      <Field label="Slug">
                        <Input name="slug" defaultValue={category.slug} />
                      </Field>
                    </div>

                    <div className="grid items-end gap-2 md:grid-cols-[1fr_100px_auto]">
                      <Field label="Description">
                        <Input
                          name="description"
                          defaultValue={category.description ?? ""}
                          placeholder="Optional"
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
                      <SubmitButton variant="secondary" size="sm">
                        Save
                      </SubmitButton>
                    </div>

                    <p
                      className="text-[11px]"
                      style={{ color: "var(--admin-text-mute)" }}
                    >
                      Used by {category.postCount} post
                      {category.postCount === 1 ? "" : "s"}
                    </p>
                  </form>
                ))}
              </div>
            ) : (
              <p
                className="rounded-md px-3 py-2 text-sm"
                style={{
                  border: "1px solid var(--admin-border)",
                  backgroundColor: "var(--admin-surface-2)",
                  color: "var(--admin-text-soft)",
                }}
              >
                No categories yet.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Tags"
            description="Lightweight, free-form labels for cross-cutting topics."
          />
          <CardBody className="space-y-4">
            <form action={createTagAction} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Name">
                  <Input name="name" required placeholder="Gold leaf" />
                </Field>
                <Field label="Slug" hint="Leave blank to auto-generate.">
                  <Input name="slug" placeholder="gold-leaf" />
                </Field>
              </div>

              <SubmitButton pendingLabel="Adding…">
                <Icon.Plus width={14} height={14} /> Add tag
              </SubmitButton>
            </form>

            {tags.length > 0 ? (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <form
                    key={tag.id}
                    action={updateTagAction}
                    className="space-y-2 rounded-md p-3"
                    style={{
                      border: "1px solid var(--admin-border)",
                      backgroundColor: "var(--admin-surface-2)",
                    }}
                  >
                    <input type="hidden" name="id" value={tag.id} />

                    <div className="grid items-end gap-2 md:grid-cols-[1fr_1fr_auto]">
                      <Field label="Name">
                        <Input name="name" defaultValue={tag.name} required />
                      </Field>
                      <Field label="Slug">
                        <Input name="slug" defaultValue={tag.slug} />
                      </Field>
                      <SubmitButton variant="secondary" size="sm">
                        Save
                      </SubmitButton>
                    </div>

                    <p
                      className="text-[11px]"
                      style={{ color: "var(--admin-text-mute)" }}
                    >
                      Used by {tag.postCount} post
                      {tag.postCount === 1 ? "" : "s"}
                    </p>
                  </form>
                ))}
              </div>
            ) : (
              <p
                className="rounded-md px-3 py-2 text-sm"
                style={{
                  border: "1px solid var(--admin-border)",
                  backgroundColor: "var(--admin-surface-2)",
                  color: "var(--admin-text-soft)",
                }}
              >
                No tags yet.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
