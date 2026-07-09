import Image from "next/image";
import Link from "next/link";

import { CurrencySelector } from "@/components/shop/currency-selector";
import { NewsletterForm } from "@/components/shop/newsletter-form";
import { getBranding } from "@/lib/branding";
import type { StoreContact } from "@/lib/site-settings";

const discoverLinks = [
  { href: "/products", label: "Shop" },
  { href: "/blogs", label: "Journal" },
  { href: "/contact", label: "Contact" },
];

const careLinks = [
  { href: "/pages/authenticity", label: "Authenticity" },
  { href: "/pages/shipping-policy", label: "Shipping" },
  { href: "/pages/returns", label: "Returns" },
  { href: "/pages/privacy-policy", label: "Privacy" },
  { href: "/pages/terms-of-service", label: "Terms" },
];

type ShopFooterProps = {
  currency: string;
  contact: StoreContact;
};

export async function ShopFooter({ currency, contact }: ShopFooterProps) {
  const branding = await getBranding();
  const year = new Date().getFullYear();
  const addressLines = [contact.addressLine1, contact.addressLine2].filter(
    (line) => line && line.length > 0,
  );
  const footerLogoUrl = branding.logoDarkUrl ?? branding.logoLightUrl;

  return (
    <footer className="bg-ink pt-16 pb-8 text-paper-2/80">
      <div className="mx-auto w-full max-w-7xl px-8 max-md:px-5">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 max-md:grid-cols-2">
          <section>
            <Link href="/" className="mb-3.5 inline-flex items-center">
              {footerLogoUrl ? (
                <Image
                  src={footerLogoUrl}
                  alt={branding.brandName}
                  width={180}
                  height={56}
                  sizes="180px"
                  className="max-h-12 w-auto object-contain"
                />
              ) : (
                <span className="font-serif text-[24px] uppercase tracking-[0.16em] text-paper">
                  {branding.brandName}
                </span>
              )}
            </Link>
            <p className="max-w-[34ch] text-sm leading-[1.7]">
              A small atelier of master Thangka painters working in Boudhanath,
              Kathmandu. Sacred art directly from studio to wall, with a fair
              share to every artist.
            </p>
            <div className="mt-6 max-w-[34ch]">
              <h5 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-paper">
                Newsletter
              </h5>
              <NewsletterForm source="footer" />
            </div>
          </section>

          <FooterColumn title="Discover" links={discoverLinks} />
          <FooterColumn title="Care" links={careLinks} />

          <section>
            <h5 className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-paper">
              Atelier
            </h5>
            <ul className="flex flex-col gap-2.5 text-sm">
              {addressLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
              {contact.phone ? <li>{contact.phone}</li> : null}
              {contact.supportEmail ? (
                <li>
                  <a
                    href={`mailto:${contact.supportEmail}`}
                    className="text-paper-2/90 hover:text-gold-light"
                  >
                    {contact.supportEmail}
                  </a>
                </li>
              ) : null}
              <li className="pt-2">
                <CurrencySelector
                  selectedCurrency={currency}
                  className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-paper-2/80"
                  labelClassName="text-paper-2/60"
                  selectClassName="h-8 border border-paper-2/25 bg-transparent px-2 text-[11px] uppercase tracking-[0.06em] text-paper"
                />
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap justify-between gap-3.5 border-t border-paper-2/15 pt-6 text-xs tracking-[0.04em] text-paper-2/60">
          <span>
            © 1998–{year} {branding.brandName}. Painted by hand in Nepal.
          </span>
          <span className="flex gap-3">
            <Link
              href="/pages/privacy-policy"
              className="text-paper-2/70 hover:text-paper-2"
            >
              Privacy
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              href="/pages/terms-of-service"
              className="text-paper-2/70 hover:text-paper-2"
            >
              Terms
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <section>
      <h5 className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-paper">
        {title}
      </h5>
      <ul className="flex flex-col gap-2.5 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-paper-2/85 hover:text-gold-light"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
