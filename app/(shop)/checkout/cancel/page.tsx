import Link from "next/link";

import { ReturnToCartButton } from "./cancel-actions";

export default function CheckoutCancelPage() {
  return (
    <section className="container-page py-14 md:py-20">
      <h1 className="font-serif text-4xl text-maroon-900 md:text-5xl">
        Checkout Cancelled
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-warm-gray-700">
        Your payment was not completed. Your cart items are still saved so you
        can review and retry checkout at any time.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/checkout"
          className="inline-flex h-10 items-center border border-maroon-700 bg-maroon-700 px-4 text-xs font-medium uppercase tracking-[0.06em] text-white hover:bg-maroon-600"
        >
          Retry Checkout
        </Link>
        <ReturnToCartButton />
        <Link
          href="/products"
          className="inline-flex h-10 items-center border border-border-light px-4 text-xs font-medium uppercase tracking-[0.06em] text-warm-gray-700 hover:bg-bg-secondary"
        >
          Continue Shopping
        </Link>
      </div>
    </section>
  );
}
