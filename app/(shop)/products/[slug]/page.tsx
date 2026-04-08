import type { Metadata } from "next";
import Image from "next/image";
import { cache } from "react";

import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { PageShell } from "@/components/ui/page-shell";
import {
  convertUsdToCurrency,
  getCurrencyContext,
} from "@/lib/currency/context";
import { productRepository } from "@/lib/repositories/product-repository";
import { buildMetaDescription, getAbsoluteUrl } from "@/lib/seo";
import { resolveUrl } from "@/lib/storage/resolve-url";
import { formatCurrency } from "@/lib/utils/formatters";

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
  if (!image) {
    return null;
  }

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
      robots: {
        index: false,
        follow: true,
      },
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
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      title: metaTitle,
      description,
      url: canonicalUrl,
      images: primaryImage
        ? [
            {
              url: primaryImage,
              alt: productData.product.title,
              width: 1200,
              height: 1200,
            },
          ]
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
  const { currency, rates } = await getCurrencyContext();
  const { slug } = await params;
  const productData = await getProductData(slug);

  if (!productData) {
    return (
      <PageShell
        title="Product not available"
        description={PRODUCT_NOT_FOUND_DESCRIPTION}
      />
    );
  }

  const primaryImage = getPrimaryImageUrl(productData);

  const startingPrice = productData.variants[0]?.price ?? null;
  const productDescription = buildMetaDescription(
    productData.product.metaDescription ?? productData.product.description,
    PRODUCT_META_FALLBACK,
    320,
  );
  const productUrl = getAbsoluteUrl(`/products/${productData.product.slug}`);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productData.product.title,
    description: productDescription,
    url: productUrl,
    image: primaryImage ? [primaryImage] : undefined,
    offers:
      productData.variants.length > 0
        ? productData.variants.map((variant) => ({
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <section className="container-page py-14 md:py-20">
        <p className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
          Product details
        </p>
        <h1 className="mt-2 font-serif text-4xl text-maroon-900 md:text-5xl">
          {productData.product.title}
        </h1>
        <p className="mt-4 text-base leading-7 text-warm-gray-700">
          {productData.product.description ??
            "Detailed product information will be added soon."}
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="relative aspect-4/5 overflow-hidden border border-border-light bg-bg-secondary">
            <Image
              src={primaryImage ?? "/next.svg"}
              alt={productData.product.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
            />
          </div>

          <div className="border border-border-light bg-white p-6">
            <p className="text-sm uppercase tracking-[0.08em] text-warm-gray-500">
              Starting from
            </p>
            <p className="mt-2 font-serif text-3xl text-maroon-900">
              {startingPrice !== null
                ? formatCurrency(
                    convertUsdToCurrency(startingPrice, currency, rates),
                    currency,
                  )
                : "Price available on request"}
            </p>
            <p className="mt-3 text-sm text-warm-gray-600">
              Includes free brocade and free international shipping.
            </p>

            {productData.variants.length > 0 ? (
              <div className="mt-6 space-y-3 border-t border-border-light pt-5">
                <p className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
                  Variants
                </p>
                <ul className="space-y-2 text-sm text-warm-gray-700">
                  {productData.variants.map((variant) => (
                    <li
                      key={variant.id}
                      className="flex items-center justify-between"
                    >
                      <span>{variant.title}</span>
                      <span>
                        {formatCurrency(
                          convertUsdToCurrency(variant.price, currency, rates),
                          currency,
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <AddToCartButton
              productId={productData.product.id}
              slug={productData.product.slug}
              title={productData.product.title}
              imageUrl={primaryImage ?? undefined}
              cartCurrency={currency}
              displayCurrency={currency}
              exchangeRates={rates}
              variants={productData.variants.map((variant) => ({
                id: variant.id,
                title: variant.title,
                price: variant.price,
              }))}
            />
          </div>
        </div>
      </section>
    </>
  );
}
