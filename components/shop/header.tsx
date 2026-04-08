import Link from "next/link";

import { CurrencySelector } from "@/components/shop/currency-selector";

const primaryLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "All Products" },
  { href: "/search", label: "Search" },
  { href: "/blogs", label: "Blogs" },
  { href: "/newsletter", label: "Newsletter" },
  { href: "/contact", label: "Contact" },
];

type ShopHeaderProps = {
  currency: string;
};

export function ShopHeader({ currency }: ShopHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border-light bg-bg-primary/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="font-serif text-lg font-semibold uppercase tracking-[0.08em] text-maroon-900"
        >
          Thangka Treasure
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-6 text-sm tracking-[0.05em] text-warm-gray-900 md:flex"
        >
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-maroon-700"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <nav
          aria-label="User"
          className="flex items-center gap-4 text-xs uppercase tracking-[0.08em] md:text-sm"
        >
          <CurrencySelector
            selectedCurrency={currency}
            className="hidden items-center gap-2 text-[11px] uppercase tracking-[0.08em] md:inline-flex"
          />
          <Link href="/account" className="hover:text-maroon-700">
            Account
          </Link>
          <Link href="/cart" className="hover:text-maroon-700">
            Cart
          </Link>
        </nav>
      </div>

      <nav
        aria-label="Primary mobile"
        className="border-t border-border-light md:hidden"
      >
        <div className="container-page flex items-center gap-4 overflow-x-auto py-2 text-xs uppercase tracking-[0.08em] text-warm-gray-900">
          {primaryLinks.map((link) => (
            <Link
              key={`mobile-${link.href}`}
              href={link.href}
              className="shrink-0 hover:text-maroon-700"
            >
              {link.label}
            </Link>
          ))}

          <CurrencySelector
            selectedCurrency={currency}
            className="shrink-0 text-[11px] uppercase tracking-[0.08em]"
          />
        </div>
      </nav>
    </header>
  );
}
