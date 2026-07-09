import Image from "next/image";
import Link from "next/link";

import { CartTrigger } from "@/components/shop/cart-trigger";
import { CurrencySelector } from "@/components/shop/currency-selector";
import { MobileMenu } from "@/components/shop/mobile-menu";
import { getBranding } from "@/lib/branding";

const leftLinks = [
  { href: "/products", label: "Shop" },
  { href: "/blogs", label: "Journal" },
];

const rightLinks = [{ href: "/contact", label: "Contact" }];

const mobileLinks = [...leftLinks, ...rightLinks];

export async function ShopHeader() {
  const branding = await getBranding();
  return (
    <header className="sticky top-0 z-40 border-b border-(--line-soft) bg-paper/85 backdrop-blur-md">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 px-8 py-4 max-md:grid-cols-[auto_1fr_auto] max-md:gap-3 max-md:px-5">
        {/* Left links */}
        <nav
          aria-label="Primary"
          className="hidden items-center gap-7 md:flex"
        >
          {leftLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] uppercase tracking-[0.08em] text-ink-soft transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="md:hidden">
          <MobileMenu links={mobileLinks} brandName={branding.brandName} />
        </div>

        {/* Centered brand */}
        <Link href="/" className="flex flex-col items-center leading-none">
          {branding.logoLightUrl ? (
            <Image
              src={branding.logoLightUrl}
              alt={branding.brandName}
              width={160}
              height={48}
              sizes="160px"
              className="max-h-10 w-auto object-contain"
              priority
            />
          ) : (
            <span className="font-serif text-[22px] uppercase tracking-[0.22em] text-ink max-md:text-[18px] max-md:tracking-[0.18em]">
              {branding.brandName}
            </span>
          )}
          {branding.brandTagline ? (
            <span className="mt-1 text-[10px] uppercase tracking-[0.32em] text-ink-mute max-md:hidden">
              {branding.brandTagline}
            </span>
          ) : null}
        </Link>

        {/* Right links + icons */}
        <div className="flex items-center justify-end gap-4">
          <nav
            aria-label="Secondary"
            className="hidden items-center gap-7 md:flex"
          >
            {rightLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[13px] uppercase tracking-[0.08em] text-ink-soft transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <CurrencySelector
            className="hidden items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-ink-soft md:inline-flex"
            labelClassName="text-ink-mute"
            selectClassName="h-7 border-0 bg-transparent text-[12px] tracking-[0.06em] text-ink"
          />

          <Link
            href="/search"
            aria-label="Search"
            className="grid h-11 w-11 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </Link>

          <Link
            href="/account"
            aria-label="Account"
            className="grid h-11 w-11 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-paper max-md:hidden"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
            </svg>
          </Link>

          <CartTrigger />
        </div>
      </div>
    </header>
  );
}
