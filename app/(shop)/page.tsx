import Link from "next/link";

import { BlogCard } from "@/components/shop/blog-card";
import { NewsletterForm } from "@/components/shop/newsletter-form";
import { ProductCard } from "@/components/shop/product-card";
import {
  convertUsdToCurrency,
  getCurrencyContext,
} from "@/lib/currency/context";
import type { ExchangeRateMap } from "@/lib/currency/convert";
import { blogRepository } from "@/lib/repositories/blog-repository";
import { productRepository } from "@/lib/repositories/product-repository";
import { resolveUrl } from "@/lib/storage/resolve-url";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

async function loadHomeData(currency: string, rates: ExchangeRateMap) {
  const [featuredProductsResult, blogPostsResult] = await Promise.allSettled([
    productRepository.findFeatured(6),
    blogRepository.listPublished({ pageSize: 2 }),
  ]);

  const featuredProducts =
    featuredProductsResult.status === "fulfilled"
      ? featuredProductsResult.value.map((product) => {
          const primaryImage = resolveUrl(product.primaryImage);
          const secondaryImage = resolveUrl(
            product.secondaryImage ?? product.primaryImage,
          );

          return {
            slug: product.slug,
            title: product.title,
            price:
              product.price !== null
                ? formatCurrency(
                    convertUsdToCurrency(product.price, currency, rates),
                    currency,
                  )
                : "Price available on request",
            primaryImage: primaryImage ?? "/next.svg",
            secondaryImage: secondaryImage ?? primaryImage ?? "/vercel.svg",
          };
        })
      : [];

  const blogPosts =
    blogPostsResult.status === "fulfilled"
      ? blogPostsResult.value.map((post) => ({
          slug: post.slug,
          title: post.title,
          excerpt:
            post.excerpt ??
            `${post.content.replace(/\s+/g, " ").trim().slice(0, 140)}...`,
          publishedAt: formatDate(post.publishedAt ?? post.createdAt),
          image:
            resolveUrl(
              post.featuredImageBucket && post.featuredImagePath
                ? {
                    bucket: post.featuredImageBucket,
                    path: post.featuredImagePath,
                  }
                : null,
            ) ?? "/next.svg",
        }))
      : [];

  return {
    featuredProducts,
    blogPosts,
  };
}

export const revalidate = 3600;

export default async function HomePage() {
  const { currency, rates } = await getCurrencyContext();
  const { featuredProducts, blogPosts } = await loadHomeData(currency, rates);

  return (
    <div>
      <section className="bg-[radial-gradient(circle_at_top,#fdf8f4,#ffffff_55%)] py-20">
        <div className="container-page">
          <p className="text-xs uppercase tracking-[0.12em] text-maroon-700">
            Tibetan Thangka Treasure
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-tight text-maroon-900 md:text-6xl">
            Sacred art with heritage craftsmanship and gallery-level
            presentation.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-warm-gray-700">
            Browse hand-painted Thangka works rooted in Buddhist tradition,
            curated for collectors and spiritual spaces worldwide.
          </p>
          <Link
            href="/products"
            className="mt-8 inline-flex h-11 items-center border border-maroon-700 bg-maroon-700 px-6 text-sm font-medium uppercase tracking-[0.08em] text-white hover:bg-maroon-600"
          >
            Browse Our Products
          </Link>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        <h2 className="font-serif text-3xl text-maroon-900 md:text-4xl">
          Highlights of Our Collection
        </h2>
        <p className="mt-3 text-sm text-warm-gray-600">
          Handpicked pieces from our latest arrivals.
        </p>

        {featuredProducts.length > 0 ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((product) => (
              <ProductCard key={product.slug} {...product} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-warm-gray-600">
            Featured products will appear here once the catalog is seeded.
          </p>
        )}
      </section>

      <section className="bg-bg-secondary py-16 md:py-20">
        <div className="container-page grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-serif text-3xl text-maroon-900 md:text-4xl">
              Our Story
            </h2>
            <p className="mt-4 text-base leading-7 text-warm-gray-700">
              For generations, our workshop has preserved the living tradition
              of Thangka painting through disciplined line work, natural
              pigments, and sacred iconographic precision.
            </p>
          </div>
          <div className="border border-border-light bg-white p-6">
            <p className="font-reading text-lg text-warm-gray-700">
              We work directly with master artisans in Kathmandu and package
              each piece with free brocade and free international shipping.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        <h2 className="font-serif text-3xl text-maroon-900 md:text-4xl">
          From the Journal
        </h2>
        {blogPosts.length > 0 ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {blogPosts.map((post) => (
              <BlogCard key={post.slug} {...post} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-warm-gray-600">
            Journal entries will appear here after the first articles are
            published.
          </p>
        )}
      </section>

      <section className="bg-maroon-50 py-16">
        <div className="container-page max-w-3xl">
          <h2 className="font-serif text-3xl text-maroon-900">
            Receive updates on new arrivals
          </h2>
          <p className="mt-3 text-sm text-warm-gray-600">
            To receive regular updates, please provide your email address.
          </p>
          <div className="mt-5">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  );
}
