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
                : "Price on request",
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

  return { featuredProducts, blogPosts };
}

export const revalidate = 3600;

export default async function HomePage() {
  const { currency, rates } = await getCurrencyContext();
  const { featuredProducts, blogPosts } = await loadHomeData(currency, rates);

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
            <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-gradient-to-br from-ink via-ink-soft to-paper-3 shadow-(--shadow-2)">
              <svg
                viewBox="0 0 400 500"
                preserveAspectRatio="xMidYMid slice"
                className="h-full w-full"
                aria-hidden="true"
              >
                <defs>
                  <radialGradient id="hero-bg" cx="50%" cy="42%" r="70%">
                    <stop offset="0%" stopColor="#5C1F2A" />
                    <stop offset="100%" stopColor="#3D1018" />
                  </radialGradient>
                  <radialGradient id="hero-halo" cx="50%" cy="48%" r="50%">
                    <stop
                      offset="0%"
                      stopColor="#E6B97A"
                      stopOpacity="0.55"
                    />
                    <stop offset="100%" stopColor="#E6B97A" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <rect width="400" height="500" fill="url(#hero-bg)" />
                <rect
                  x="14"
                  y="14"
                  width="372"
                  height="472"
                  fill="none"
                  stroke="#B58A4A"
                  strokeWidth="1"
                  opacity="0.45"
                />
                <circle cx="200" cy="240" r="180" fill="url(#hero-halo)" />
                <g transform="translate(200 360)" fill="#C9772D" opacity="0.95">
                  <path d="M0 0 q-60 -30 -90 -8 q-20 14 -8 26 q26 18 98 -2z" />
                  <path d="M0 0 q60 -30 90 -8 q20 14 8 26 q-26 18 -98 -2z" />
                  <path d="M0 4 q-40 -10 -50 14 q-4 12 8 16 q22 6 42 -16z" />
                  <path d="M0 4 q40 -10 50 14 q4 12 -8 16 q-22 6 -42 -16z" />
                </g>
                <g transform="translate(200 240)">
                  <ellipse
                    cx="0"
                    cy="20"
                    rx="78"
                    ry="92"
                    fill="#C9772D"
                    opacity="0.85"
                  />
                  <ellipse cx="0" cy="-44" rx="22" ry="28" fill="#E6B97A" />
                  <path
                    d="M-9 -70 Q0 -85 9 -70 Q0 -76 -9 -70Z"
                    fill="#E6B97A"
                  />
                  <path
                    d="M-46 52 Q-30 24 0 28 Q30 24 46 52 Q30 66 0 66 Q-30 66 -46 52Z"
                    fill="#E6B97A"
                    opacity="0.75"
                  />
                </g>
              </svg>
            </div>
            <div className="absolute -bottom-6 -left-6 hidden rounded-md bg-paper p-5 shadow-(--shadow-1) md:block">
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
          <div className="relative aspect-[5/6] overflow-hidden rounded-md bg-paper-3 shadow-(--shadow-1)">
            <svg
              viewBox="0 0 400 500"
              preserveAspectRatio="xMidYMid slice"
              className="h-full w-full"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="craft-bg" cx="50%" cy="42%" r="70%">
                  <stop offset="0%" stopColor="#7A2E3A" />
                  <stop offset="100%" stopColor="#3D1018" />
                </radialGradient>
              </defs>
              <rect width="400" height="500" fill="url(#craft-bg)" />
              <g
                transform="translate(200 250)"
                stroke="#E6B97A"
                fill="none"
                strokeWidth="0.7"
                opacity="0.95"
              >
                <circle r="180" />
                <circle r="150" />
                <circle r="120" />
                <circle r="90" />
                <circle r="60" />
                <circle r="30" />
                {Array.from({ length: 24 }).map((_, i) => (
                  <line
                    key={i}
                    x1="0"
                    y1="0"
                    x2={Math.cos((i * Math.PI) / 12) * 180}
                    y2={Math.sin((i * Math.PI) / 12) * 180}
                    strokeWidth="0.3"
                  />
                ))}
              </g>
              <g transform="translate(200 250)" fill="#C9772D">
                <circle r="22" />
              </g>
            </svg>
          </div>
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

      {/* Artisans */}
      <section className="border-b border-(--line-soft) bg-paper-2 py-20 md:py-24">
        <div className="container-page">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="mb-2 text-[11.5px] font-medium uppercase tracking-[0.22em] text-saffron">
                The atelier
              </p>
              <h2 className="font-serif text-[clamp(34px,4vw,46px)] leading-tight font-medium tracking-[-0.005em] text-ink">
                Painted by{" "}
                <em className="font-normal text-ink-soft">human hands</em>
              </h2>
            </div>
            <Link
              href="/contact"
              className="border-b border-ink-mute pb-1 text-[12.5px] uppercase tracking-[0.18em] text-ink-soft hover:border-ink hover:text-ink"
            >
              Visit the studio →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-7 max-md:grid-cols-1">
            <ArtistCard
              initial="T"
              name="Tenzin Dorjee"
              role="Master painter · 19 years"
              body="Apprenticed at age twelve in the Karma Gadri tradition. Recognized for the quietude of his Buddhas."
            />
            <ArtistCard
              initial="P"
              name="Pema Lhamo"
              role="Senior painter · 14 years"
              body="Specialises in the female deities — Tara, Vajrayogini, Kurukulla. Crisp line, generous color."
            />
            <ArtistCard
              initial="N"
              name="Ngawang Sherpa"
              role="Mandala master · 22 years"
              body="A patient hand for the largest pieces. His Kalachakras have travelled to four continents."
            />
          </div>
        </div>
      </section>

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

      {/* Newsletter */}
      <section className="bg-ink py-20 text-paper">
        <div className="container-page mx-auto max-w-3xl text-center">
          <p className="mb-4 text-[11.5px] font-medium uppercase tracking-[0.22em] text-gold-light">
            Stay close
          </p>
          <h2 className="font-serif text-[clamp(34px,4vw,46px)] leading-tight font-medium tracking-[-0.005em]">
            Letters from the atelier,{" "}
            <em className="font-normal text-paper-2/80">once a month</em>.
          </h2>
          <p className="mx-auto mt-4 max-w-[54ch] text-[15px] leading-[1.65] text-paper-2/75">
            New pieces, work-in-progress photographs, notes from the painters,
            and the occasional dispatch from Boudhanath. Never spam, never
            shared.
          </p>
          <div className="mx-auto mt-9 max-w-lg">
            <NewsletterForm />
          </div>
        </div>
      </section>
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

function ArtistCard({
  initial,
  name,
  role,
  body,
}: {
  initial: string;
  name: string;
  role: string;
  body: string;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-md bg-paper p-7 shadow-(--shadow-1) transition-all hover:-translate-y-0.5 hover:shadow-(--shadow-2)">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose to-ink font-serif text-xl text-paper">
          {initial}
        </div>
        <div>
          <h3 className="font-serif text-xl font-medium text-ink">{name}</h3>
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-mute">
            {role}
          </p>
        </div>
      </div>
      <p className="text-[14.5px] leading-[1.6] text-ink-soft">{body}</p>
    </article>
  );
}
