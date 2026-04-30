import type { MetadataRoute } from "next";

import { blogRepository } from "@/lib/repositories/blog-repository";
import { productRepository } from "@/lib/repositories/product-repository";
import { getAbsoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productEntries, blogEntries] = await Promise.all([
    productRepository.listActiveSitemapEntries(),
    blogRepository.listPublishedSitemapEntries(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: getAbsoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: getAbsoluteUrl("/products"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: getAbsoluteUrl("/blogs"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: getAbsoluteUrl("/contact"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  const productRoutes: MetadataRoute.Sitemap = productEntries.map((entry) => ({
    url: getAbsoluteUrl(`/products/${entry.slug}`),
    lastModified: entry.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const blogRoutes: MetadataRoute.Sitemap = blogEntries.map((entry) => ({
    url: getAbsoluteUrl(`/blogs/${entry.slug}`),
    lastModified: entry.updatedAt ?? entry.publishedAt ?? new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes, ...blogRoutes];
}
