import Image from "next/image";
import Link from "next/link";

export type ProductCardData = {
  slug: string;
  title: string;
  price: string;
  primaryImage: string;
  secondaryImage?: string;
};

export function ProductCard({
  slug,
  title,
  price,
  primaryImage,
  secondaryImage,
}: ProductCardData) {
  return (
    <Link
      href={`/products/${slug}`}
      className="group block border border-border-light bg-white p-3 transition hover:shadow-[0_1px_3px_rgba(0,0,0,0.08)] focus-visible:shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
    >
      <div className="relative aspect-4/5 overflow-hidden bg-bg-secondary">
        <Image
          src={primaryImage}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition-opacity duration-300 group-hover:opacity-0 group-focus-visible:opacity-0"
        />
        <Image
          src={secondaryImage ?? primaryImage}
          alt=""
          aria-hidden="true"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      </div>

      <div className="mt-4 space-y-2">
        <h3 className="font-serif text-lg text-maroon-900">{title}</h3>
        <p className="text-sm text-warm-gray-700">{price}</p>
        <p className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
          Free Brocade and Free Shipping
        </p>
      </div>
    </Link>
  );
}
