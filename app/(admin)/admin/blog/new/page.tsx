import { blogRepository } from "@/lib/repositories/blog-repository";

import { createBlogPostAction } from "../actions";
import { BlogPostForm } from "../blog-post-form";
async function loadTaxonomyOptions() {
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

export default async function AdminNewBlogPage() {
  const { categories, tags } = await loadTaxonomyOptions();

  return (
    <BlogPostForm
      title="Create blog post"
      description="Draft, publish immediately, or schedule a publish time."
      submitLabel="Create post"
      action={createBlogPostAction}
      categories={categories}
      tags={tags}
      values={{
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        featuredImageAlt: "",
        featuredImageUrl: "",
        status: "draft",
        scheduledAt: "",
        categoryIds: [],
        tagIds: [],
      }}
    />
  );
}
