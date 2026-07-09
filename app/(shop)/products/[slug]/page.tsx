import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";

import { ProductBuyPanel } from "@/components/shop/product-buy-panel";
import { ProductCard } from "@/components/shop/product-card";
import {
  ProductGallery,
  type GalleryImage,
} from "@/components/shop/product-gallery";
import { SelectedFrameProvider } from "@/components/shop/selected-frame-context";
import {
  convertUsdToCurrency,
  getCurrencyContext,
} from "@/lib/currency/context";
import { frameRepository } from "@/lib/repositories/frame-repository";
import { productRepository } from "@/lib/repositories/product-repository";
import { buildMetaDescription, getAbsoluteUrl } from "@/lib/seo";
import { resolveUrl } from "@/lib/storage/resolve-url";
import { formatCurrency } from "@/lib/utils/formatters";
import { sanitizeRichText } from "@/lib/utils/sanitize-html";

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>;
};

const PRODUCT_META_FALLBACK =
  "Authentic Tibetan Thangka artwork with free brocade and free international shipping.";
const PRODUCT_NOT_FOUND_DESCRIPTION =
  "This product could not be found or has not been published yet.";

const getProductData = cache(async (slug: string) => {
  try {
    return await productRepository.findBySlug(slug);
  } catch {
    return null;
  }
});

function getPrimaryImageUrl(
  productData: NonNullable<
    Awaited<ReturnType<typeof productRepository.findBySlug>>
  >,
) {
  const image = productData.images[0];
  if (!image) return null;
  return resolveUrl({ bucket: image.bucket, path: image.path });
}

export const revalidate = 1800;

export async function generateStaticParams() {
  try {
    const slugs = await productRepository.listActiveSlugs(250);
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const productData = await getProductData(slug);

  if (!productData) {
    return {
      title: "Product not available",
      description: PRODUCT_NOT_FOUND_DESCRIPTION,
      robots: { index: false, follow: true },
    };
  }

  const primaryImage = getPrimaryImageUrl(productData);
  const metaTitle = productData.product.metaTitle ?? productData.product.title;
  const description = buildMetaDescription(
    productData.product.metaDescription ?? productData.product.description,
    PRODUCT_META_FALLBACK,
  );
  const canonicalUrl = getAbsoluteUrl(`/products/${productData.product.slug}`);

  return {
    title: metaTitle,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      title: metaTitle,
      description,
      url: canonicalUrl,
      images: primaryImage
        ? [{ url: primaryImage, alt: productData.product.title, width: 1200, height: 1200 }]
        : undefined,
    },
    twitter: {
      card: primaryImage ? "summary_large_image" : "summary",
      title: metaTitle,
      description,
      images: primaryImage ? [primaryImage] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;
  // Currency context and the product query are independent — run together.
  const [{ currency, rates }, productData] = await Promise.all([
    getCurrencyContext(),
    getProductData(slug),
  ]);

  if (!productData) {
    return (
      <section className="container-page py-24 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-saffron">
          Not available
        </p>
        <h1 className="mt-3 font-serif text-4xl font-medium text-ink">
          This piece could not be found.
        </h1>
        <p className="mt-4 text-ink-soft">{PRODUCT_NOT_FOUND_DESCRIPTION}</p>
        <Link
          href="/products"
          className="mt-8 inline-flex rounded-full bg-ink px-6 py-3 text-[12px] uppercase tracking-[0.16em] text-paper hover:bg-ink-soft"
        >
          Back to the archive
        </Link>
      </section>
    );
  }

  const { product, variants, images, attributes, category } = productData;

  const galleryImages: GalleryImage[] = images
    .map((image, index) => {
      const url = resolveUrl({ bucket: image.bucket, path: image.path });
      if (!url) return null;
      return {
        src: url,
        alt: image.altText ?? `${product.title} — view ${index + 1}`,
      } satisfies GalleryImage;
    })
    .filter((image): image is GalleryImage => image !== null);

  const primaryImage = galleryImages[0]?.src ?? null;
  const startingPrice = variants[0]?.price ?? null;
  const startingDisplay =
    startingPrice !== null
      ? formatCurrency(
          convertUsdToCurrency(startingPrice, currency, rates),
          currency,
        )
      : null;

  const productDescription = buildMetaDescription(
    product.metaDescription ?? product.description,
    PRODUCT_META_FALLBACK,
    320,
  );
  const productUrl = getAbsoluteUrl(`/products/${product.slug}`);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: productDescription,
    url: productUrl,
    image: primaryImage ? [primaryImage] : undefined,
    offers:
      variants.length > 0
        ? variants.map((variant) => ({
            "@type": "Offer",
            url: productUrl,
            priceCurrency: "USD",
            price: (variant.price / 100).toFixed(2),
            availability: "https://schema.org/InStock",
            itemCondition: "https://schema.org/NewCondition",
            sku: variant.sku ?? undefined,
          }))
        : undefined,
  };

  // Related products and frames both only need the loaded product — fetch in
  // parallel instead of one after the other.
  const [relatedResult, productFrames] = await Promise.all([
    productRepository
      .search({
        productType: product.productType ?? undefined,
        limit: 6,
      })
      .catch(() => null),
    frameRepository.listForProductPublic(product.id).catch(() => []),
  ]);

  const relatedRows = relatedResult
    ? relatedResult.rows
        .filter((row) => row.slug !== product.slug)
        .slice(0, 4)
    : [];

  const eyebrow = category?.name ?? product.productType ?? "Sacred Art";
  const artist = product.vendor ?? null;

  const frameOptions = productFrames.map((frame) => ({
    id: frame.id,
    name: frame.name,
    priceDelta: frame.priceDelta,
    imageUrl:
      frame.imageBucket && frame.imagePath
        ? resolveUrl({ bucket: frame.imageBucket, path: frame.imagePath })
        : null,
    isDefault: frame.isDefault,
    cutoutX: frame.cutoutX,
    cutoutY: frame.cutoutY,
    cutoutWidth: frame.cutoutWidth,
    cutoutHeight: frame.cutoutHeight,
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      <div className="container-page">
        <nav className="py-6 text-xs uppercase tracking-[0.16em] text-ink-mute">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <span className="mx-2.5 opacity-50">/</span>
          <Link href="/products" className="hover:text-ink">
            Shop
          </Link>
          <span className="mx-2.5 opacity-50">/</span>
          <span className="text-ink">{product.title}</span>
        </nav>

        <SelectedFrameProvider frames={frameOptions}>
        <section className="grid grid-cols-[1.2fr_1fr] items-start gap-16 pb-20 max-[980px]:grid-cols-1 max-[980px]:gap-9">
          <ProductGallery images={galleryImages} badge="One of one" />

          <div>
            <div className="mb-3.5 text-[11.5px] font-medium uppercase tracking-[0.22em] text-saffron">
              {eyebrow}
            </div>
            <h1 className="font-serif text-[clamp(36px,4.5vw,52px)] leading-[1.05] font-medium tracking-[-0.01em] text-ink">
              {product.title}
            </h1>

            <div className="my-6 flex items-baseline gap-3.5 border-y border-(--line) py-6">
              <div className="font-serif text-[42px] font-medium leading-none text-ink">
                {startingDisplay ?? "Price on request"}
              </div>
              <div className="text-[13px] text-ink-mute">
                +{" "}
                <b className="font-medium text-ink">free</b> insured shipping
                worldwide
              </div>
            </div>

            {product.description ? (
              <div
                className="prose prose-stone mb-7 max-w-none font-serif text-[17px] leading-[1.65] text-ink-soft prose-p:my-3 prose-ul:my-3"
                dangerouslySetInnerHTML={{
                  __html: sanitizeRichText(product.description),
                }}
              />
            ) : null}

            <ProductBuyPanel
              productId={product.id}
              slug={product.slug}
              title={product.title}
              imageUrl={primaryImage ?? undefined}
              cartCurrency={currency}
              displayCurrency={currency}
              exchangeRates={rates}
              variants={variants.map((variant) => ({
                id: variant.id,
                title: variant.title,
                price: variant.price,
              }))}
              frames={frameOptions}
            />

            <div className="mt-7 grid grid-cols-2 gap-3.5 text-[12.5px] leading-[1.4] text-ink-soft">
              <Assurance
                icon={<path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z" />}
              >
                Lifetime certificate of authenticity
              </Assurance>
              <Assurance
                icon={
                  <>
                    <path d="M5 7h14l-2 13H7L5 7Z" />
                    <path d="M9 7V5a3 3 0 0 1 6 0v2" />
                  </>
                }
              >
                Artist&rsquo;s signed letter included
              </Assurance>
              <Assurance
                icon={
                  <>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </>
                }
              >
                Ships in 5–7 business days
              </Assurance>
              <Assurance
                icon={
                  <>
                    <path d="M9 14l-4-4 4-4" />
                    <path d="M5 10h12a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4h-1" />
                  </>
                }
              >
                30-day no-questions returns
              </Assurance>
            </div>

            <div className="mt-9 border-t border-(--line-soft) pt-7">
              <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3.5 text-sm">
                {artist ? <Spec term="Artist" detail={artist} /> : null}
                {category ? (
                  <Spec term="Category" detail={category.name} />
                ) : null}
                {product.productType &&
                product.productType !== category?.name ? (
                  <Spec term="Type" detail={product.productType} />
                ) : null}
                {attributes.map((entry) => (
                  <Spec
                    key={entry.definition.id}
                    term={entry.definition.name}
                    detail={
                      entry.definition.unit
                        ? `${entry.values.join(" · ")} ${entry.definition.unit}`
                        : entry.values.join(" · ")
                    }
                  />
                ))}
                {product.tags && product.tags.length > 0 ? (
                  <Spec term="Tags" detail={product.tags.join(" · ")} />
                ) : null}
              </dl>
            </div>
          </div>
        </section>
        </SelectedFrameProvider>
      </div>

      {/* Symbolism */}
      <section className="bg-paper py-20 md:py-22">
        <div className="container-page">
          <h2 className="text-center font-serif text-[clamp(34px,4vw,46px)] font-medium tracking-[-0.005em] text-ink">
            Symbols within <em className="font-normal text-ink-soft">this</em>{" "}
            painting
          </h2>
          <p className="mx-auto mt-3 max-w-[54ch] text-center text-[15px] text-ink-mute">
            Every gesture, color, and ornament in a Thangka is a visualisation.
            Look closely and a quiet vocabulary emerges.
          </p>
          <div className="mt-12 grid grid-cols-4 gap-6 max-md:grid-cols-2">
            <SymbolCard
              title="Bhumisparsha Mudra"
              body="Right hand touching earth — calling the ground itself to witness awakening."
              icon={
                <>
                  <path d="M12 4v16M5 12h14" />
                  <circle cx="12" cy="12" r="5" />
                </>
              }
            />
            <SymbolCard
              title="Lotus Throne"
              body="Eight-petaled — the Eightfold Path. Born of mud, blooming pure."
              icon={
                <>
                  <path d="M12 3c4 4 4 6 0 12-4-6-4-8 0-12Z" />
                  <path d="M3 15h18" />
                </>
              }
            />
            <SymbolCard
              title="Golden Aureole"
              body="Concentric halos for body, speech, and mind — the three doors of practice."
              icon={
                <>
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="3" />
                </>
              }
            />
            <SymbolCard
              title="Twin Bodhisattvas"
              body="Wisdom and loving-kindness flanking the awakened one."
              icon={
                <>
                  <path d="M5 14c2-4 5-6 7-6s5 2 7 6" />
                  <path d="M5 14c2 4 5 6 7 6s5-2 7-6" />
                </>
              }
            />
          </div>
        </div>
      </section>

      {/* Care + Practice */}
      <section className="border-t border-(--line-soft) bg-paper-2 py-20">
        <div className="container-page grid grid-cols-2 gap-12 max-md:grid-cols-1">
          <div className="rounded-md bg-paper p-9 shadow-(--shadow-1)">
            <h3 className="mb-4.5 font-serif text-[28px] font-medium text-ink">
              Hanging your Thangka
            </h3>
            <ul className="flex flex-col gap-3.5 text-[14.5px] leading-[1.5] text-ink-soft">
              <Step n={1}>
                Choose a place above eye level — Thangkas are meant to be looked
                up to, not down upon.
              </Step>
              <Step n={2}>
                Keep it from direct sunlight, fireplaces, and steam — mineral
                pigments age slowly in cool, dry rooms.
              </Step>
              <Step n={3}>
                Hang from the silk loop at the top dowel; never from the canvas
                itself.
              </Step>
              <Step n={4}>
                Roll inward (face on the inside) when storing. Always with the
                wooden dowel at the bottom.
              </Step>
            </ul>
          </div>
          <div className="rounded-md bg-paper p-9 shadow-(--shadow-1)">
            <h3 className="mb-4.5 font-serif text-[28px] font-medium text-ink">
              A simple practice
            </h3>
            <ul className="flex flex-col gap-3.5 text-[14.5px] leading-[1.5] text-ink-soft">
              <Step n={1}>
                Begin with three breaths — settle the body, soften the gaze.
              </Step>
              <Step n={2}>
                Rest your eyes on the central figure&rsquo;s face. Don&rsquo;t
                analyse. Just receive.
              </Step>
              <Step n={3}>
                Notice the posture: still, upright, unhurried. Let your spine
                echo it.
              </Step>
              <Step n={4}>
                Recite, if it feels right:{" "}
                <em className="text-ink">Om Muni Muni Maha Muniye Soha.</em>{" "}
                Seven times is enough.
              </Step>
            </ul>
          </div>
        </div>
      </section>

      {/* Related */}
      {relatedRows.length > 0 ? (
        <section className="border-t border-(--line-soft) bg-paper-2 py-20">
          <div className="container-page">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
              <h2 className="font-serif text-[42px] font-medium tracking-[-0.005em] text-ink">
                You may also{" "}
                <em className="font-normal text-ink-soft">be drawn to</em>
              </h2>
              <Link
                href="/products"
                className="border-b border-ink-mute pb-1 text-[12.5px] uppercase tracking-[0.18em] text-ink-soft hover:border-ink hover:text-ink"
              >
                View full archive →
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-7 max-[980px]:grid-cols-2">
              {relatedRows.map((row) => {
                const primary = resolveUrl(row.primaryImage);
                const secondary = resolveUrl(
                  row.secondaryImage ?? row.primaryImage,
                );
                return (
                  <ProductCard
                    key={row.id}
                    slug={row.slug}
                    title={row.title}
                    price={
                      row.price !== null
                        ? formatCurrency(
                            convertUsdToCurrency(row.price, currency, rates),
                            currency,
                          )
                        : "Price on request"
                    }
                    primaryImage={primary ?? "/next.svg"}
                    secondaryImage={secondary ?? primary ?? "/vercel.svg"}
                  />
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

function Spec({ term, detail }: { term: string; detail: string }) {
  return (
    <>
      <dt className="text-xs uppercase tracking-[0.04em] text-ink-mute">
        {term}
      </dt>
      <dd className="m-0 text-ink">{detail}</dd>
    </>
  );
}

function Assurance({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        className="mt-0.5 shrink-0 text-saffron"
      >
        {icon}
      </svg>
      <span>{children}</span>
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
    <div className="rounded-md border border-(--line) bg-paper p-6 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-ink-mute hover:shadow-(--shadow-2)">
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

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span className="w-5.5 shrink-0 font-serif text-lg italic text-saffron">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
