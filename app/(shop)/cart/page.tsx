import { CartView } from "@/components/shop/cart-view";
import { getCurrencyContext } from "@/lib/currency/context";

export default async function CartPage() {
  const { currency, rates } = await getCurrencyContext();

  return (
    <section className="container-page py-14 md:py-20">
      <h1 className="font-serif text-4xl text-maroon-900 md:text-5xl">Cart</h1>
      <p className="mt-4 max-w-2xl text-base text-warm-gray-700">
        Review selected items before continuing to checkout.
      </p>
      <CartView displayCurrency={currency} exchangeRates={rates} />
    </section>
  );
}
