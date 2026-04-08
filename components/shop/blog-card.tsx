import Image from "next/image";
import Link from "next/link";

export type BlogCardData = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  image: string;
};

export function BlogCard({
  slug,
  title,
  excerpt,
  publishedAt,
  image,
}: BlogCardData) {
  return (
    <article className="group border border-border-light bg-white">
      <Link href={`/blogs/${slug}`} className="block">
        <div className="relative aspect-video overflow-hidden bg-bg-secondary">
          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover transition duration-300 group-hover:opacity-90 group-focus-within:opacity-90"
          />
        </div>
      </Link>

      <div className="space-y-3 p-5">
        <p className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
          {publishedAt}
        </p>
        <h3 className="font-serif text-2xl text-maroon-900">
          <Link href={`/blogs/${slug}`} className="hover:text-maroon-700">
            {title}
          </Link>
        </h3>
        <p className="line-clamp-3 text-sm text-warm-gray-700">{excerpt}</p>
        <Link
          href={`/blogs/${slug}`}
          className="text-sm font-medium text-maroon-700 hover:text-maroon-600"
        >
          Read article
        </Link>
      </div>
    </article>
  );
}
