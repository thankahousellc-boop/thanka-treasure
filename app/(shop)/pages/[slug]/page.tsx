import type { Metadata } from "next";
import { cache } from "react";

import { PageShell } from "@/components/ui/page-shell";
import { pagesRepository } from "@/lib/repositories/pages-repository";
import { buildMetaDescription, getAbsoluteUrl, toPlainText } from "@/lib/seo";
import { sanitizeRichText } from "@/lib/utils/sanitize-html";

type StaticPageProps = {
  params: Promise<{ slug: string }>;
};

const STATIC_PAGE_META_FALLBACK =
  "Read curated information and policy details from thanka Treasure.";
const STATIC_PAGE_NOT_FOUND_DESCRIPTION =
  "The requested page is unavailable or has not been published yet.";

const getPageData = cache(async (slug: string) => {
  try {
    return await pagesRepository.findBySlug(slug);
  } catch {
    return null;
  }
});

export const revalidate = 86400;

export async function generateStaticParams() {
  try {
    const slugs = await pagesRepository.listPublishedSlugs(250);
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: StaticPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageData(slug);

  if (!page) {
    return {
      title: "Page not found",
      description: STATIC_PAGE_NOT_FOUND_DESCRIPTION,
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const title = page.metaTitle ?? page.title;
  const description = buildMetaDescription(
    page.metaDescription ?? toPlainText(page.content ?? ""),
    STATIC_PAGE_META_FALLBACK,
  );
  const canonicalUrl = getAbsoluteUrl(`/pages/${page.slug}`);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonicalUrl,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function StaticPage({ params }: StaticPageProps) {
  const { slug } = await params;
  const page = await getPageData(slug);

  if (!page) {
    return (
      <PageShell
        title="Page not found"
        description={STATIC_PAGE_NOT_FOUND_DESCRIPTION}
      />
    );
  }

  const trimmedContent = page.content?.trim();
  const htmlContent = trimmedContent
    ? sanitizeRichText(trimmedContent)
    : undefined;

  return (
    <article className="container-page py-14 md:py-20">
      <h1 className="font-serif text-4xl text-maroon-900 md:text-5xl">
        {page.title}
      </h1>

      {htmlContent ? (
        <div
          className="prose prose-stone mt-8 max-w-3xl leading-8 text-warm-gray-800"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      ) : (
        <p className="mt-6 text-base leading-7 text-warm-gray-700">
          Content for this page will be available soon.
        </p>
      )}
    </article>
  );
}
