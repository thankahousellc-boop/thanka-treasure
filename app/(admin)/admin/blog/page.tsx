import {
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  Icon,
} from "@/components/admin/ui";
import { blogRepository } from "@/lib/repositories/blog-repository";

import { BlogTable } from "./blog-table";

async function loadPostsForAdmin() {
  try {
    return await blogRepository.listForAdmin(200);
  } catch {
    return [];
  }
}

export default async function AdminBlogPage() {
  const posts = await loadPostsForAdmin();

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className="admin-display text-2xl font-semibold"
            style={{ color: "var(--admin-text)" }}
          >
            Blog posts
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--admin-text-soft)" }}
          >
            Draft, publish, and archive editorial content.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink href="/admin/blog/categories" variant="secondary">
            Categories and tags
          </ButtonLink>
          <ButtonLink href="/admin/blog/new">
            <Icon.Plus width={14} height={14} />
            <span>New post</span>
          </ButtonLink>
        </div>
      </header>

      <Card>
        <CardHeader
          title="All posts"
          description="Click a row to open the editor."
        />
        {posts.length > 0 ? (
          <BlogTable rows={posts} />
        ) : (
          <CardBody>
            <p
              className="text-sm"
              style={{ color: "var(--admin-text-soft)" }}
            >
              No posts found. Create and publish your first article.
            </p>
          </CardBody>
        )}
      </Card>
    </section>
  );
}
