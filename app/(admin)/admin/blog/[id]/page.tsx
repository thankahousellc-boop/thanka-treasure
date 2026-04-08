import { notFound } from "next/navigation";
import { blogRepository } from "@/lib/repositories/blog-repository";
import { resolveUrl } from "@/lib/storage/resolve-url";

import { updateBlogPostAction } from "../actions";
import { BlogPostForm } from "../blog-post-form";

type AdminEditBlogPageProps = {
  params: Promise<{ id: string }>;
};

function toDateTimeLocalValue(input: Date | null) {
  if (!input) {
    return "";
  }

  return input.toISOString().slice(0, 16);
}

export default async function AdminEditBlogPage({
  params,
}: AdminEditBlogPageProps) {
  const { id } = await params;
  const [record, taxonomy] = await Promise.all([
    blogRepository.findByIdWithTaxonomyForAdmin(id),
    (async () => {
      try {
        const [categories, tags] = await Promise.all([
          blogRepository.listCategoriesForAdmin(),
          blogRepository.listTagsForAdmin(),
        ]);
        return { categories, tags };
      } catch {
        return { categories: [], tags: [] };
      }
    })(),
  ]);

  if (!record) {
    notFound();
  }
  const post = record.post;
  const updateAction = updateBlogPostAction.bind(null, id);

  return (
    <BlogPostForm
      title={`Edit blog post: ${post.title}`}
      description="Update content and publishing status."
      submitLabel="Save changes"
      action={updateAction}
      categories={taxonomy.categories}
      tags={taxonomy.tags}
      values={{
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt ?? "",
        content: post.content,
        featuredImageAlt: post.featuredImageAlt ?? "",
        featuredImageUrl:
          resolveUrl(
            post.featuredImageBucket && post.featuredImagePath
              ? {
                  bucket: post.featuredImageBucket,
                  path: post.featuredImagePath,
                }
              : null,
          ) ?? "",
        status: post.status as "draft" | "published" | "scheduled",
        scheduledAt: toDateTimeLocalValue(post.scheduledAt),
        categoryIds: record.categoryIds,
        tagIds: record.tagIds,
      }}
    />
  );
}
