import type { Metadata } from "next";
import Image from "next/image";
import { cache } from "react";

import { BlogCard } from "@/components/shop/blog-card";
import { PageShell } from "@/components/ui/page-shell";
import { blogRepository } from "@/lib/repositories/blog-repository";
import { buildMetaDescription, getAbsoluteUrl, toPlainText } from "@/lib/seo";
import { resolveUrl } from "@/lib/storage/resolve-url";
import { formatDate } from "@/lib/utils/formatters";

type BlogDetailPageProps = {
  params: Promise<{ slug: string }>;
};

const BLOG_META_FALLBACK =
  "Read stories, guides, and cultural insights from the Thangka Treasure journal.";
const BLOG_NOT_FOUND_DESCRIPTION =
  "This article may have moved, is unpublished, or does not exist.";

const getPostData = cache(async (slug: string) => {
  try {
    return await blogRepository.findBySlug(slug);
  } catch {
    return null;
  }
});

function getCoverImageUrl(
  post: NonNullable<Awaited<ReturnType<typeof blogRepository.findBySlug>>>,
) {
  if (!post.featuredImageBucket || !post.featuredImagePath) {
    return null;
  }

  return resolveUrl({
    bucket: post.featuredImageBucket,
    path: post.featuredImagePath,
  });
}

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const slugs = await blogRepository.listPublishedSlugs(250);
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: BlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostData(slug);

  if (!post) {
    return {
      title: "Article not found",
      description: BLOG_NOT_FOUND_DESCRIPTION,
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const coverImage = getCoverImageUrl(post);
  const description = buildMetaDescription(
    post.excerpt ?? toPlainText(post.content),
    BLOG_META_FALLBACK,
  );
  const canonicalUrl = getAbsoluteUrl(`/blogs/${post.slug}`);

  return {
    title: post.title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url: canonicalUrl,
      publishedTime: (post.publishedAt ?? post.createdAt).toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      images: coverImage
        ? [
            {
              url: coverImage,
              alt: post.featuredImageAlt ?? post.title,
              width: 1200,
              height: 630,
            },
          ]
        : undefined,
    },
    twitter: {
      card: coverImage ? "summary_large_image" : "summary",
      title: post.title,
      description,
      images: coverImage ? [coverImage] : undefined,
    },
  };
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;
  const post = await getPostData(slug);

  if (!post) {
    return (
      <PageShell
        title="Article not found"
        description={BLOG_NOT_FOUND_DESCRIPTION}
      />
    );
  }

  const coverImage = getCoverImageUrl(post);
  const relatedPosts = await (async () => {
    try {
      return await blogRepository.findRelated(post.id, 3);
    } catch {
      return [];
    }
  })();

  const htmlContent = post.content.trim();

  const blogDescription = buildMetaDescription(
    post.excerpt ?? toPlainText(post.content),
    BLOG_META_FALLBACK,
    320,
  );
  const articleUrl = getAbsoluteUrl(`/blogs/${post.slug}`);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: blogDescription,
    url: articleUrl,
    datePublished: (post.publishedAt ?? post.createdAt).toISOString(),
    dateModified: post.updatedAt.toISOString(),
    image: coverImage ? [coverImage] : undefined,
    mainEntityOfPage: articleUrl,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <article className="container-page py-14 md:py-20">
        <p className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
          {formatDate(post.publishedAt ?? post.createdAt)}
        </p>
        <h1 className="mt-3 max-w-4xl font-serif text-4xl text-maroon-900 md:text-5xl">
          {post.title}
        </h1>
        {post.excerpt ? (
          <p className="mt-4 max-w-3xl text-base text-warm-gray-700">
            {post.excerpt}
          </p>
        ) : null}

        {coverImage ? (
          <div className="relative mt-8 aspect-video overflow-hidden border border-border-light bg-bg-secondary">
            <Image
              src={coverImage}
              alt={post.featuredImageAlt ?? post.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 960px"
              className="object-cover"
            />
          </div>
        ) : null}

        {htmlContent ? (
          <div
            className="prose prose-stone mt-10 max-w-3xl leading-8 text-warm-gray-800"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        ) : (
          <p className="mt-10 text-base leading-7 text-warm-gray-700">
            Content is coming soon.
          </p>
        )}

        {relatedPosts.length > 0 ? (
          <section className="mt-16 border-t border-border-light pt-10">
            <h2 className="font-serif text-3xl text-maroon-900">
              Related Articles
            </h2>
            <p className="mt-2 text-sm text-warm-gray-600">
              Continue exploring with articles connected to this topic.
            </p>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              {relatedPosts.map((related) => (
                <BlogCard
                  key={related.id}
                  slug={related.slug}
                  title={related.title}
                  excerpt={
                    related.excerpt ??
                    `${toPlainText(related.content).slice(0, 150).trim()}...`
                  }
                  publishedAt={formatDate(
                    related.publishedAt ?? related.createdAt,
                  )}
                  image={
                    resolveUrl(
                      related.featuredImageBucket && related.featuredImagePath
                        ? {
                            bucket: related.featuredImageBucket,
                            path: related.featuredImagePath,
                          }
                        : null,
                    ) ?? "/next.svg"
                  }
                />
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </>
  );
}
