import Image from "next/image";
import Link from "next/link";

import { BlogCard } from "@/components/shop/blog-card";
import { ProductCard } from "@/components/shop/product-card";
import { getFeaturedProducts } from "@/lib/catalog-cache";
import { blogRepository } from "@/lib/repositories/blog-repository";
import { reviewsRepository } from "@/lib/repositories/reviews-repository";
import { resolveUrl } from "@/lib/storage/resolve-url";
import { formatDate } from "@/lib/utils/formatters";

async function loadHomeData() {
  // Currency is applied client-side (<Price>), so this page carries only raw
  // USD prices and stays statically renderable / ISR.
  const [featuredProductsResult, blogPostsResult, reviewsResult] =
    await Promise.allSettled([
      getFeaturedProducts(6),
      blogRepository.listPublished({ pageSize: 2 }),
      reviewsRepository.listPublished(6),
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
            priceCents: product.price,
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

  const reviews =
    reviewsResult.status === "fulfilled"
      ? reviewsResult.value.map((review) => ({
          id: review.id,
          authorName: review.authorName,
          rating: review.rating,
          body: review.body,
          productTitle: review.productTitle,
          reviewedAt: review.reviewedAt
            ? formatDate(review.reviewedAt)
            : null,
        }))
      : [];

  return { featuredProducts, blogPosts, reviews };
}

export const revalidate = 3600;

export default async function HomePage() {
  const { featuredProducts, blogPosts, reviews } = await loadHomeData();
  const heroProduct = featuredProducts[0] ?? null;
  const craftProduct = featuredProducts[1] ?? featuredProducts[0] ?? null;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-(--line-soft) bg-paper">
        <div className="container-page grid items-center gap-12 py-20 md:grid-cols-[1.15fr_1fr] md:py-28">
          <div>
            <p className="mb-5 text-[11.5px] font-medium uppercase tracking-[0.22em] text-saffron">
              Sacred Art · Est. 1998
            </p>
            <h1 className="font-serif text-[clamp(40px,5.5vw,72px)] leading-[1.02] font-medium tracking-[-0.012em] text-ink">
              The painted{" "}
              <em className="font-normal text-ink-soft">presence</em>{" "}
              of awakened beings,{" "}
              <em className="font-normal text-ink-soft">unbroken</em> for a
              thousand years.
            </h1>
            <p className="mt-7 max-w-[58ch] text-[17px] leading-[1.65] text-ink-soft">
              A small atelier of master Thangka painters, working in Boudhanath,
              Kathmandu. Mineral pigment, 24-karat gold, and breath-thin lines —
              each piece blessed at the stupa and shipped directly to your wall.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <Link
                href="/products"
                className="inline-flex items-center gap-2.5 rounded-full bg-ink px-7 py-4 text-[13px] font-medium uppercase tracking-[0.16em] text-paper transition hover:-translate-y-0.5 hover:bg-ink-soft hover:shadow-(--shadow-1)"
              >
                Browse the archive →
              </Link>
              <Link
                href="/blogs"
                className="inline-flex items-center gap-2 border-b border-ink-mute pb-1 text-[12.5px] uppercase tracking-[0.18em] text-ink-soft hover:border-ink hover:text-ink"
              >
                Read the journal
              </Link>
            </div>
          </div>

          <div className="relative">
            <Link
              href={heroProduct ? `/products/${heroProduct.slug}` : "/products"}
              aria-label={
                heroProduct
                  ? `View ${heroProduct.title}`
                  : "Browse featured Thangkas"
              }
              className="group relative block aspect-4/5 overflow-hidden rounded-md bg-ink shadow-(--shadow-2) outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2"
            >
              {heroProduct ? (
                <Image
                  src={heroProduct.primaryImage}
                  alt={heroProduct.title}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 45vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
              ) : (
                <div className="absolute inset-0 bg-linear-to-br from-ink via-ink-soft to-paper-3" />
              )}
              <div
                className="pointer-events-none absolute inset-3.5 border border-gold/40"
                aria-hidden="true"
              />
            </Link>
            <div className="absolute -bottom-6 -left-6 hidden max-w-[18rem] rounded-md bg-paper p-5 shadow-(--shadow-1) md:block">
              <p className="font-serif text-[15px] italic text-ink-soft">
                &ldquo;I do not paint a Buddha. I uncover the one already
                waiting in the cloth.&rdquo;
              </p>
              <p className="mt-2 text-[10.5px] uppercase tracking-[0.22em] text-ink-mute">
                Tenzin Dorjee · Master painter
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="border-b border-(--line-soft) py-20 md:py-24">
        <div className="container-page">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="mb-2 text-[11.5px] font-medium uppercase tracking-[0.22em] text-saffron">
                Recently completed
              </p>
              <h2 className="font-serif text-[clamp(34px,4vw,46px)] leading-tight font-medium tracking-[-0.005em] text-ink">
                Highlights from the{" "}
                <em className="font-normal text-ink-soft">archive</em>
              </h2>
            </div>
            <Link
              href="/products"
              className="border-b border-ink-mute pb-1 text-[12.5px] uppercase tracking-[0.18em] text-ink-soft hover:border-ink hover:text-ink"
            >
              View all pieces →
            </Link>
          </div>

          {featuredProducts.length > 0 ? (
            <div className="grid grid-cols-3 gap-x-7 gap-y-12 max-[1100px]:grid-cols-2 max-[560px]:grid-cols-1">
              {featuredProducts.slice(0, 3).map((product) => (
                <ProductCard key={product.slug} {...product} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-soft">
              Featured pieces will appear here once products are published.
            </p>
          )}
        </div>
      </section>

      {/* The Craft (story) */}
      <section className="border-b border-(--line-soft) bg-paper-2 py-20 md:py-24">
        <div className="container-page grid items-center gap-16 max-md:gap-9 md:grid-cols-[1fr_1.1fr]">
          {craftProduct ? (
            <Link
              href={`/products/${craftProduct.slug}`}
              aria-label={`View ${craftProduct.title}`}
              className="group relative block aspect-5/6 overflow-hidden rounded-md bg-paper-3 shadow-(--shadow-1) outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2"
            >
              <Image
                src={craftProduct.primaryImage}
                alt={craftProduct.title}
                fill
                sizes="(max-width: 768px) 100vw, 45vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
              <div
                className="pointer-events-none absolute inset-3.5 border border-gold/30"
                aria-hidden="true"
              />
            </Link>
          ) : (
            <div className="relative aspect-5/6 overflow-hidden rounded-md bg-linear-to-br from-ink-soft to-maroon-900 shadow-(--shadow-1)" />
          )}
          <div>
            <p className="mb-4 text-[11.5px] font-medium uppercase tracking-[0.22em] text-saffron">
              The craft
            </p>
            <h2 className="font-serif text-[clamp(34px,4vw,46px)] leading-tight font-medium tracking-[-0.005em] text-ink">
              Four months of breath, line,{" "}
              <em className="font-normal text-ink-soft">and silence</em>.
            </h2>
            <p className="mt-5 text-[16.5px] leading-[1.75] text-ink-soft">
              Cotton canvas sized with chalk and lime. Pigments ground from
              lapis, malachite, vermillion, conch — bound in yak-hide glue.
              Twenty-four-karat gold leaf burnished by hand with agate.
            </p>
            <div className="my-6 border-l-2 border-saffron py-1.5 pl-5.5 font-serif text-[22px] leading-[1.4] italic text-ink">
              &ldquo;The Buddha is already in the cloth. The painter only
              uncovers him, slowly, with great care.&rdquo;
            </div>
            <p className="text-[16.5px] leading-[1.75] text-ink-soft">
              Each piece passes through three artists, four months, and a final
              eye-opening — the moment the painting becomes alive. Then it is
              taken to Boudhanath stupa, blessed, rolled in silk, and shipped to
              you.
            </p>
            <Link
              href="/blogs"
              className="mt-7 inline-flex border-b border-ink-mute pb-1 text-[12.5px] uppercase tracking-[0.18em] text-ink-soft hover:border-ink hover:text-ink"
            >
              How a Thangka is painted →
            </Link>
          </div>
        </div>
      </section>

      {/* Symbolism */}
      <section className="border-b border-(--line-soft) bg-paper py-20 md:py-24">
        <div className="container-page">
          <div className="mx-auto max-w-[60ch] text-center">
            <p className="mb-3 text-[11.5px] font-medium uppercase tracking-[0.22em] text-saffron">
              Symbolism
            </p>
            <h2 className="font-serif text-[clamp(34px,4vw,46px)] leading-tight font-medium tracking-[-0.005em] text-ink">
              Every line is a{" "}
              <em className="font-normal text-ink-soft">visualisation</em>
            </h2>
            <p className="mt-4 text-[15px] text-ink-mute">
              Mudras, mantras, mandalas. A Thangka is not decoration — it is a
              meditation made visible.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-4 gap-6 max-md:grid-cols-2">
            <SymbolCard
              title="Mudras"
              body="Hand gestures of awakening — earth-touching, meditation, teaching, fearlessness."
              icon={
                <>
                  <path d="M12 4v16M5 12h14" />
                  <circle cx="12" cy="12" r="5" />
                </>
              }
            />
            <SymbolCard
              title="Mandalas"
              body="Sacred geometry as a map of the awakened mind, drawn in concentric rings."
              icon={
                <>
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="3" />
                </>
              }
            />
            <SymbolCard
              title="Lotus thrones"
              body="Eight-petaled — the Eightfold Path. Born of mud, blooming pure."
              icon={
                <>
                  <path d="M12 3c4 4 4 6 0 12-4-6-4-8 0-12Z" />
                  <path d="M3 15h18" />
                </>
              }
            />
            <SymbolCard
              title="Aureoles"
              body="Concentric haloes for body, speech, and mind — the three doors of practice."
              icon={
                <>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M5 14c2-4 5-6 7-6s5 2 7 6" />
                  <path d="M5 14c2 4 5 6 7 6s5-2 7-6" />
                </>
              }
            />
          </div>
        </div>
      </section>

      {/* Reviews */}
      {reviews.length > 0 ? (
        <section className="border-b border-(--line-soft) bg-paper-2 py-20 md:py-24">
          <div className="container-page">
            <div className="mb-12 flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="mb-2 text-[11.5px] font-medium uppercase tracking-[0.22em] text-saffron">
                  The collectors
                </p>
                <h2 className="font-serif text-[clamp(34px,4vw,46px)] leading-tight font-medium tracking-[-0.005em] text-ink">
                  Words from{" "}
                  <em className="font-normal text-ink-soft">our patrons</em>
                </h2>
              </div>
              <a
                href="https://www.etsy.com"
                target="_blank"
                rel="noopener noreferrer"
                className="border-b border-ink-mute pb-1 text-[12.5px] uppercase tracking-[0.18em] text-ink-soft hover:border-ink hover:text-ink"
              >
                Read on Etsy →
              </a>
            </div>
            <div className="grid grid-cols-3 gap-7 max-md:grid-cols-1">
              {reviews.map((review) => (
                <ReviewCard key={review.id} {...review} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Journal */}
      {blogPosts.length > 0 ? (
        <section className="border-b border-(--line-soft) py-20 md:py-24">
          <div className="container-page">
            <div className="mb-12 flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="mb-2 text-[11.5px] font-medium uppercase tracking-[0.22em] text-saffron">
                  The journal
                </p>
                <h2 className="font-serif text-[clamp(34px,4vw,46px)] leading-tight font-medium tracking-[-0.005em] text-ink">
                  Writings from the{" "}
                  <em className="font-normal text-ink-soft">studio</em>
                </h2>
              </div>
              <Link
                href="/blogs"
                className="border-b border-ink-mute pb-1 text-[12.5px] uppercase tracking-[0.18em] text-ink-soft hover:border-ink hover:text-ink"
              >
                All articles →
              </Link>
            </div>
            <div className="grid gap-9 lg:grid-cols-2">
              {blogPosts.map((post) => (
                <BlogCard key={post.slug} {...post} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SymbolCard({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-(--line) bg-paper p-7 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-ink-mute hover:shadow-(--shadow-2)">
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-paper-2 text-ink">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          {icon}
        </svg>
      </div>
      <h4 className="mb-1.5 font-serif text-xl font-medium text-ink">
        {title}
      </h4>
      <p className="text-[13.5px] leading-[1.55] text-ink-soft">{body}</p>
    </div>
  );
}

function ReviewCard({
  authorName,
  rating,
  body,
  productTitle,
  reviewedAt,
}: {
  authorName: string;
  rating: number;
  body: string;
  productTitle: string | null;
  reviewedAt: string | null;
}) {
  const initial = authorName.trim().charAt(0).toUpperCase() || "★";
  const stars = Math.max(0, Math.min(5, rating));

  return (
    <article className="flex flex-col gap-4 rounded-md bg-paper p-7 shadow-(--shadow-1) transition-all hover:-translate-y-0.5 hover:shadow-(--shadow-2)">
      <div
        className="flex items-center gap-1 text-[15px] text-saffron"
        aria-label={`${stars} out of 5 stars`}
      >
        {"★".repeat(stars)}
        <span className="text-ink-mute">{"★".repeat(5 - stars)}</span>
      </div>
      <p className="text-[14.5px] leading-[1.6] text-ink-soft">
        &ldquo;{body}&rdquo;
      </p>
      <div className="mt-auto flex items-center gap-4 pt-2">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose to-ink font-serif text-lg text-paper">
          {initial}
        </div>
        <div>
          <h3 className="font-serif text-[17px] font-medium text-ink">
            {authorName}
          </h3>
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-mute">
            {[productTitle, reviewedAt].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
    </article>
  );
}
