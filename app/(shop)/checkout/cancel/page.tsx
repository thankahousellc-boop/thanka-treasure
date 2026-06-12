import Link from "next/link";

import { ReturnToCartButton } from "./cancel-actions";

export default function CheckoutCancelPage() {
  return (
    <section className="container-page py-14 md:py-20">
      <h1 className="font-serif text-4xl text-ink md:text-5xl">
        Checkout Cancelled
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-ink-soft">
        Your payment was not completed. Your cart items are still saved so you
        can review and retry checkout at any time.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/checkout"
          className="inline-flex h-10 items-center border border-ink-soft bg-ink-soft px-4 text-xs font-medium uppercase tracking-[0.06em] text-white hover:bg-ink"
        >
          Retry Checkout
        </Link>
        <ReturnToCartButton />
        <Link
          href="/products"
          className="inline-flex h-10 items-center border border-paper-3 px-4 text-xs font-medium uppercase tracking-[0.06em] text-ink-soft hover:bg-paper-2"
        >
          Continue Shopping
        </Link>
      </div>
    </section>
  );
}
