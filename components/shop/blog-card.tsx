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
    <article className="group flex flex-col gap-4">
      <Link
        href={`/blogs/${slug}`}
        className="relative block aspect-video overflow-hidden rounded-md bg-paper-3"
      >
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
      </Link>

      <div className="space-y-2.5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-saffron">
          {publishedAt}
        </p>
        <h3 className="font-serif text-2xl leading-tight font-medium text-ink">
          <Link href={`/blogs/${slug}`} className="hover:text-ink-soft">
            {title}
          </Link>
        </h3>
        <p className="line-clamp-3 text-[14.5px] leading-[1.65] text-ink-soft">
          {excerpt}
        </p>
        <Link
          href={`/blogs/${slug}`}
          className="inline-flex border-b border-ink-mute pb-1 text-[12px] uppercase tracking-[0.16em] text-ink-soft hover:border-ink hover:text-ink"
        >
          Read article →
        </Link>
      </div>
    </article>
  );
}
