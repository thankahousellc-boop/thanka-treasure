import Image from "next/image";
import Link from "next/link";

import { BlogCard } from "@/components/shop/blog-card";
import CraftGuide, { CRAFT_STAGES } from "@/components/shop/craft-guide";
import { Price } from "@/components/shop/price";
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
          reviewedAt: review.reviewedAt ? formatDate(review.reviewedAt) : null,
        }))
      : [];

  return { featuredProducts, blogPosts, reviews };
}

export const revalidate = 3600;

// Every plate on the page is pulled from the live catalogue; only the craft
// sequence in <CraftGuide> uses the fixed /public/craft photographs. When the
// catalogue has fewer pieces than the page has slots, indexes wrap.
const CATALOGUE_FALLBACK = {
  src: CRAFT_STAGES[7].src,
  alt: CRAFT_STAGES[7].alt,
  href: "/products",
};

const STORY_FACTS = [
  { label: "Established", value: "1978" },
  { label: "Galleries in Thamel", value: "Three" },
  { label: "Years of practice", value: "Nearly 50" },
];

const TRUST_MARKS = [
  "Hand-painted in Thamel, Kathmandu",
  "Blessed at Kapan Monastery",
  "Free worldwide shipping",
  "Three galleries since 1978",
];

type FeaturedProduct = Awaited<
  ReturnType<typeof loadHomeData>
>["featuredProducts"][number];

// Wraps so a three-piece catalogue still fills every slot on the page.
function plateAt(products: FeaturedProduct[], index: number) {
  if (products.length === 0) return CATALOGUE_FALLBACK;
  const product = products[index % products.length];
  return {
    src: product.primaryImage,
    alt: product.title,
    href: `/products/${product.slug}`,
  };
}

export default async function HomePage() {
  const { featuredProducts, blogPosts, reviews } = await loadHomeData();

  const heroProduct = featuredProducts[0] ?? null;
  const heroPlate = plateAt(featuredProducts, 0);
  // Push the grid past the hero piece when the catalogue is deep enough.
  const galleryProducts =
    featuredProducts.length >= 4
      ? featuredProducts.slice(1, 4)
      : featuredProducts.slice(0, 3);
  const storyPlate = plateAt(featuredProducts, 5);
  const symbolPlate = plateAt(featuredProducts, 3);

  const ratedReviews = reviews.filter((review) => review.rating > 0);
  const averageRating =
    ratedReviews.length > 0
      ? ratedReviews.reduce((sum, review) => sum + review.rating, 0) /
        ratedReviews.length
      : null;

  return (
    <div className="bg-paper">
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-(--line) bg-paper">
        {/* Warm wash behind the plate column. Fades out leftward so the panel
            never shows a hard vertical seam against the paper. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 hidden w-[56%] bg-linear-to-l from-paper-2 via-paper-2/55 to-transparent md:block"
        />

        <div className="relative container-page grid items-center gap-12 py-14 md:grid-cols-[1.05fr_1fr] md:gap-16 md:py-20 md:pb-24 lg:gap-20">
          <div className="order-2 md:order-1">
            <p className="flex items-center gap-3 text-[10.5px] uppercase tracking-[0.28em] text-saffron">
              Sacred Art · Est. 1978
              <span aria-hidden="true" className="h-px w-10 bg-saffron/45" />
            </p>

            {/* leading-[1.08] keeps Cormorant descenders clear of the next
                line; pb-3 on the emphasis reserves room for the swash. */}
            <h1 className="mt-6 max-w-[15ch] font-serif text-[clamp(40px,5.2vw,68px)] leading-[1.08] font-medium tracking-[-0.02em] text-balance text-ink">
              Four months of breath, line, and{" "}
              <em className="relative inline-block pb-3 font-normal text-ink-soft">
                silence
                <svg
                  aria-hidden="true"
                  viewBox="0 0 200 10"
                  preserveAspectRatio="none"
                  className="absolute bottom-0 left-0 h-2 w-full text-saffron/70"
                >
                  <path
                    d="M2 7c40-4 78-5 118-2.5 26 1.6 48 2.4 78 0.8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </em>
              .
            </h1>

            <p className="mt-7 max-w-[44ch] text-[17px] leading-[1.65] text-ink-soft">
              Hand-painted thangkas from a family atelier in Thamel, Kathmandu —
              mineral pigment, twenty-four-karat gold, and nearly fifty years of
              practice.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
              <Link
                href="/products"
                className="group inline-flex min-h-12 items-center gap-3 bg-ink px-8 py-4 text-[12.5px] font-medium uppercase tracking-[0.18em] text-paper transition-colors hover:bg-ink-soft"
              >
                Browse the collection
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 ease-out group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
              <Link
                href="#how-its-made"
                className="group inline-flex min-h-12 items-center text-[12.5px] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:text-ink"
              >
                <span className="border-b border-ink-mute pb-1 transition-colors group-hover:border-ink">
                  See how one is painted
                </span>
              </Link>
            </div>

            {averageRating !== null ? (
              <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-(--line) pt-6">
                <span
                  className="text-[15px] tracking-[0.14em] text-saffron"
                  aria-hidden="true"
                >
                  {"★".repeat(Math.round(averageRating))}
                  <span className="text-paper-3">
                    {"★".repeat(5 - Math.round(averageRating))}
                  </span>
                </span>
                <p className="text-[12.5px] text-ink-soft">
                  <span className="font-medium text-ink">
                    {averageRating.toFixed(1)}
                  </span>{" "}
                  average from {ratedReviews.length} collector{" "}
                  {ratedReviews.length === 1 ? "review" : "reviews"}
                </p>
              </div>
            ) : null}
          </div>

          <div className="order-1 flex justify-center md:order-2 md:justify-end">
            {/* Width cap keeps the 3:4 plate — and its caption — inside the
                first viewport instead of running off the bottom edge. */}
            <div className="relative w-full max-w-84 lg:max-w-92 xl:max-w-100">
              <figure>
                {/* Offset frame scoped to the plate only — matching the image
                    box so its edges never cross the caption below. */}
                <div className="relative">
                  <div
                    aria-hidden="true"
                    className="absolute -top-4 -right-4 hidden aspect-3/4 w-full border border-gold/30 md:block"
                  />
                  <Link
                    href={
                      heroProduct ? `/products/${heroProduct.slug}` : "/products"
                    }
                    aria-label={
                      heroProduct
                        ? `View ${heroProduct.title}`
                        : "Browse hand-painted thangkas"
                    }
                    className="group relative block aspect-3/4 overflow-hidden bg-paper-2 shadow-(--shadow-2) outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2"
                  >
                    <Image
                      src={heroPlate.src}
                      alt={heroPlate.alt}
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    />
                    <div
                      className="pointer-events-none absolute inset-3 border border-gold/35"
                      aria-hidden="true"
                    />
                  </Link>
                </div>

                {heroProduct ? (
                  <figcaption className="mt-4 flex items-end justify-between gap-5 border-t border-(--line) pt-3.5">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-ink-mute">
                        From the gallery
                      </p>
                      <p className="mt-1 font-serif text-[19px] leading-tight text-ink">
                        {heroProduct.title}
                      </p>
                    </div>
                    <Price
                      cents={heroProduct.priceCents}
                      className="shrink-0 font-serif text-[19px] text-ink-soft"
                    />
                  </figcaption>
                ) : null}
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section aria-label="What every piece includes" className="border-b border-(--line) bg-paper-2">
        <ul className="container-page flex flex-wrap items-center justify-between gap-x-8 gap-y-2.5 py-4">
          {TRUST_MARKS.map((mark) => (
            <li
              key={mark}
              className="flex items-center gap-2.5 text-[11px] uppercase tracking-[0.16em] text-ink-soft"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="shrink-0 text-saffron"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {mark}
            </li>
          ))}
        </ul>
      </section>

      {/* Gallery */}
      <section className="border-b border-(--line) py-16 md:py-24">
        <div className="container-page">
          <SectionHeading
            index="01"
            label="The Gallery"
            title="Artwork from our"
            emphasis="Gallery"
            action={{ href: "/products", text: "All pieces →" }}
          />

          {featuredProducts.length > 0 ? (
            <div className="mt-12 grid grid-cols-3 gap-x-8 gap-y-14 max-[1100px]:grid-cols-2 max-[560px]:grid-cols-1">
              {galleryProducts.map((product, index) => (
                <div key={product.slug}>
                  <p className="mb-3 border-t border-(--line) pt-3 text-[10.5px] uppercase tracking-[0.24em] text-ink-mute">
                    Plate {toRoman(index + 1)}
                  </p>
                  <ProductCard {...product} />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-12 border-t border-(--line) pt-6 text-sm text-ink-soft">
              Featured pieces will appear here once products are published.
            </p>
          )}
        </div>
      </section>

      {/* Our story */}
      <section className="border-b border-(--line) bg-paper-2 py-16 md:py-24">
        <div className="container-page grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <figure>
            <Link
              href={storyPlate.href}
              aria-label={`View ${storyPlate.alt}`}
              className="group relative block aspect-4/3 overflow-hidden bg-paper-3 shadow-(--shadow-1) outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 md:aspect-4/5"
            >
              <Image
                src={storyPlate.src}
                alt={storyPlate.alt}
                fill
                sizes="(max-width: 768px) 100vw, 46vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
              <div
                className="pointer-events-none absolute inset-3 border border-gold/30"
                aria-hidden="true"
              />
            </Link>
            <figcaption className="mt-3 border-t border-(--line) pt-3 text-[10.5px] uppercase tracking-[0.2em] text-ink-mute">
              From the gallery — {storyPlate.alt}
            </figcaption>
          </figure>

          <div>
            <SectionKicker index="02" label="Our Story" />
            <h2 className="mt-5 font-serif text-[clamp(32px,4.2vw,50px)] leading-[1.05] font-medium tracking-[-0.012em] text-ink">
              A street stall in Basantapur,{" "}
              <em className="font-normal text-ink-soft">
                and the patience to wait
              </em>
            </h2>
            <p className="mt-6 max-w-[52ch] text-[17px] leading-[1.75] text-ink-soft">
              Every thangka carries a story; so do we. We began in the late
              1960s as a simple street stall in Basantapur, armed with nothing
              but a deep respect for Tibetan art and the patience to wait. In
              1978 that patience paid off — a single humble corner in Thamel,
              which grew shop by shop into three galleries. Nearly fifty years
              on, built on trust, meticulous craftsmanship, and an unwavering
              belief in sacred art, Surendra&rsquo;s Tibetan Thangka Treasure
              stands as one of Kathmandu&rsquo;s most respected names in thangka
              art.
            </p>

            <dl className="mt-9 flex flex-wrap gap-x-12 gap-y-5 border-t border-(--line) pt-6">
              {STORY_FACTS.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-[10.5px] uppercase tracking-[0.22em] text-ink-mute">
                    {fact.label}
                  </dt>
                  <dd className="mt-1 font-serif text-[26px] leading-none text-ink">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* The making */}
      <section id="how-its-made" className="border-b border-(--line)">
        <CraftGuide />
      </section>

      {/* Symbolism */}
      <section className="border-b border-(--line) py-16 md:py-24">
        <div className="container-page">
          <SectionHeading
            index="04"
            label="Symbolism"
            title="Every line is a"
            emphasis="visualisation"
          />

          <div className="mt-12 grid gap-10 border-t border-(--line) pt-10 md:grid-cols-12 md:gap-14">
            <figure className="md:col-span-5">
              <Link
                href={symbolPlate.href}
                aria-label={`View ${symbolPlate.alt}`}
                className="group relative block aspect-3/4 overflow-hidden bg-paper-2 shadow-(--shadow-1) outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2"
              >
                <Image
                  src={symbolPlate.src}
                  alt={symbolPlate.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
                <div
                  className="pointer-events-none absolute inset-3 border border-gold/30"
                  aria-hidden="true"
                />
              </Link>
              <figcaption className="mt-3 border-t border-(--line-soft) pt-3 text-[10.5px] uppercase tracking-[0.2em] text-ink-mute">
                {symbolPlate.alt}
              </figcaption>
            </figure>

            <div className="md:col-span-7">
              <blockquote>
                <p className="font-serif text-[clamp(22px,2.5vw,30px)] leading-[1.35] text-ink">
                  &ldquo;All the elements of a Tibetan religious painting have a
                  symbolic value. These symbols serve as aids to developing
                  inner qualities on the spiritual path. The deities themselves
                  are regarded as representing particular characteristics of
                  enlightenment.&rdquo;
                </p>
                <footer className="mt-4 text-[10.5px] uppercase tracking-[0.24em] text-saffron">
                  Dalai Lama
                </footer>
              </blockquote>

              <div className="mt-10 grid gap-x-8 gap-y-8 border-t border-(--line) pt-8 sm:grid-cols-2">
                <SymbolEntry
                  number="i"
                  title="Mudras"
                  body="Hand gestures of awakening — earth-touching, meditation, teaching."
                  icon={
                    <>
                      <path d="M12 4v16M5 12h14" />
                      <circle cx="12" cy="12" r="5" />
                    </>
                  }
                />
                <SymbolEntry
                  number="ii"
                  title="Mandalas"
                  body="Sacred geometry as a map of the awakened mind, in concentric rings."
                  icon={
                    <>
                      <circle cx="12" cy="12" r="9" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  }
                />
                <SymbolEntry
                  number="iii"
                  title="Lotus thrones"
                  body="Eight-petaled — the Eightfold Path. Born of mud, blooming pure."
                  icon={
                    <>
                      <path d="M12 3c4 4 4 6 0 12-4-6-4-8 0-12Z" />
                      <path d="M3 15h18" />
                    </>
                  }
                />
                <SymbolEntry
                  number="iv"
                  title="Aureoles"
                  body="Haloes for body, speech, and mind — the three doors of practice."
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
          </div>
        </div>
      </section>

      {/* Collectors */}
      {reviews.length > 0 ? (
        <section className="border-b border-(--line) bg-paper-2 py-16 md:py-24">
          <div className="container-page">
            <SectionHeading
              index="05"
              label="The Collectors"
              title="Words from"
              emphasis="our patrons"
              action={{
                href: "https://www.etsy.com",
                text: "Read on Etsy →",
                external: true,
              }}
            />
            <div className="mt-12 grid border-t border-(--line) md:grid-cols-3">
              {reviews.map((review) => (
                <ReviewEntry key={review.id} {...review} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Journal */}
      {blogPosts.length > 0 ? (
        <section className="py-16 md:py-24">
          <div className="container-page">
            <SectionHeading
              index="06"
              label="The Journal"
              title="Writings from the"
              emphasis="studio"
              action={{ href: "/blogs", text: "All articles →" }}
            />
            <div className="mt-12 grid gap-10 border-t border-(--line) pt-10 lg:grid-cols-2">
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

function toRoman(value: number) {
  const numerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
  return numerals[value - 1] ?? String(value);
}

function SectionKicker({
  index,
  label,
}: {
  index: string;
  label: string;
}) {
  return (
    <p className="flex items-center gap-3 text-[10.5px] uppercase tracking-[0.28em] text-ink-mute">
      <span className="text-saffron">No. {index}</span>
      <span aria-hidden="true" className="h-px w-8 bg-(--line)" />
      <span>{label}</span>
    </p>
  );
}

function SectionHeading({
  index,
  label,
  title,
  emphasis,
  action,
}: {
  index: string;
  label: string;
  title: string;
  emphasis: string;
  action?: { href: string; text: string; external?: boolean };
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
      <div>
        <SectionKicker index={index} label={label} />
        <h2 className="mt-5 font-serif text-[clamp(32px,4.2vw,52px)] leading-[1.05] font-medium tracking-[-0.012em] text-ink">
          {title} <em className="font-normal text-ink-soft">{emphasis}</em>
        </h2>
      </div>
      {action ? (
        action.external ? (
          <a
            href={action.href}
            target="_blank"
            rel="noopener noreferrer"
            className="border-b border-ink-mute pb-1.5 text-[12px] uppercase tracking-[0.2em] text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            {action.text}
          </a>
        ) : (
          <Link
            href={action.href}
            className="border-b border-ink-mute pb-1.5 text-[12px] uppercase tracking-[0.2em] text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            {action.text}
          </Link>
        )
      ) : null}
    </div>
  );
}

function SymbolEntry({
  number,
  title,
  body,
  icon,
}: {
  number: string;
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 text-ink-mute">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {icon}
        </svg>
        <span className="text-[10.5px] uppercase tracking-[0.24em]">
          {number}
        </span>
      </div>
      <h3 className="mt-4 font-serif text-[24px] leading-tight font-medium text-ink">
        {title}
      </h3>
      <p className="mt-2 max-w-[34ch] text-[14.5px] leading-[1.6] text-ink-soft">
        {body}
      </p>
    </div>
  );
}

function ReviewEntry({
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
  const stars = Math.max(0, Math.min(5, rating));

  return (
    <article className="flex flex-col gap-4 border-b border-(--line-soft) py-8 md:border-b-0 md:border-r md:border-(--line-soft) md:pr-8 md:last:border-r-0 md:not-first:pl-8">
      <div
        className="flex items-center gap-1 text-[13px] tracking-[0.18em] text-saffron"
        aria-label={`${stars} out of 5 stars`}
      >
        {"★".repeat(stars)}
        <span className="text-paper-3">{"★".repeat(5 - stars)}</span>
      </div>
      <p className="font-serif text-[19px] leading-[1.5] text-ink">
        &ldquo;{body}&rdquo;
      </p>
      <div className="mt-auto pt-2">
        <h3 className="text-[12px] font-medium uppercase tracking-[0.18em] text-ink-soft">
          {authorName}
        </h3>
        <p className="mt-1 text-[10.5px] uppercase tracking-[0.18em] text-ink-mute">
          {[productTitle, reviewedAt].filter(Boolean).join(" · ")}
        </p>
      </div>
    </article>
  );
}
