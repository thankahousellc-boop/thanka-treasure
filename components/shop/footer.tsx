import Link from "next/link";

import { CurrencySelector } from "@/components/shop/currency-selector";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "All Products" },
  { href: "/blogs", label: "Blogs" },
  { href: "/newsletter", label: "Newsletter" },
  { href: "/contact", label: "Contact" },
];

const policyLinks = [
  { href: "/pages/privacy-policy", label: "Privacy Policy" },
  { href: "/pages/shipping-policy", label: "Shipping Policy" },
  { href: "/pages/terms-of-service", label: "Terms of Service" },
];

type ShopFooterProps = {
  currency: string;
};

export function ShopFooter({ currency }: ShopFooterProps) {
  return (
    <footer className="mt-20 bg-maroon-800 text-white">
      <div className="container-page grid gap-10 py-12 md:grid-cols-3">
        <section>
          <h2 className="font-serif text-xl">Thangka Treasure</h2>
          <p className="mt-3 text-sm text-maroon-100">
            Sacred Tibetan art presented with gallery-level curation and global
            shipping.
          </p>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em]">
            Quick Links
          </h3>
          <nav aria-label="Quick links">
            <ul className="mt-3 space-y-2 text-sm text-maroon-100">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-maroon-100 hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em]">
            Policies
          </h3>
          <nav aria-label="Policy links">
            <ul className="mt-3 space-y-2 text-sm text-maroon-100">
              {policyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-maroon-100 hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="mt-4 text-sm text-maroon-100">
            Paryatan Marg, Thamel, Kathmandu
          </p>
          <div className="mt-4">
            <CurrencySelector
              selectedCurrency={currency}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-maroon-100"
              labelClassName="text-maroon-100"
              selectClassName="h-8 border border-maroon-200/40 bg-maroon-900 px-2 text-xs uppercase tracking-[0.06em] text-white"
            />
          </div>
        </section>
      </div>
    </footer>
  );
}
