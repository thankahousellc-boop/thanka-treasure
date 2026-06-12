import { CheckoutEmbedded } from "@/components/shop/checkout-embedded";

export default function CheckoutPage() {
  return (
    <section className="container-page py-14 md:py-20">
      <h1 className="font-serif text-4xl text-ink md:text-5xl">
        Checkout
      </h1>
      <p className="mt-4 max-w-2xl text-base text-ink-soft">
        Secure payment powered by Stripe Embedded Checkout.
      </p>
      <CheckoutEmbedded />
    </section>
  );
}
