import { NewsletterForm } from "@/components/shop/newsletter-form";

export default function NewsletterPage() {
  return (
    <section className="container-page py-14 md:py-20">
      <h1 className="font-serif text-4xl text-maroon-900 md:text-5xl">
        Newsletter
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-warm-gray-700">
        Join our mailing list for new arrivals, featured collections, and
        stories from the Thangka journal.
      </p>

      <div className="mt-8 max-w-2xl border border-border-light bg-white p-6">
        <NewsletterForm source="manual" />
      </div>
    </section>
  );
}
