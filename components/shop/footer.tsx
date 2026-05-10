import Link from "next/link";

import { CurrencySelector } from "@/components/shop/currency-selector";
import type { StoreContact } from "@/lib/site-settings";

const discoverLinks = [
  { href: "/products", label: "Shop" },
  { href: "/blogs", label: "Journal" },
  { href: "/newsletter", label: "Newsletter" },
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

export function ShopFooter({ currency, contact }: ShopFooterProps) {
  const year = new Date().getFullYear();
  const addressLines = [contact.addressLine1, contact.addressLine2].filter(
    (line) => line && line.length > 0,
  );

  return (
    <footer className="bg-ink pt-16 pb-8 text-paper-2/75">
      <div className="mx-auto w-full max-w-7xl px-8 max-md:px-5">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 max-md:grid-cols-2">
          <section>
            <div className="mb-3.5 font-serif text-[24px] uppercase tracking-[0.16em] text-paper">
              Thanka Treasure
            </div>
            <p className="max-w-[34ch] text-sm leading-[1.7]">
              A small atelier of master Thangka painters working in Boudhanath,
              Kathmandu. Sacred art directly from studio to wall, with a fair
              share to every artist.
            </p>
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
                    className="hover:text-gold-light"
                  >
                    {contact.supportEmail}
                  </a>
                </li>
              ) : null}
              <li className="pt-2">
                <CurrencySelector
                  selectedCurrency={currency}
                  className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-paper-2/75"
                  labelClassName="text-paper-2/55"
                  selectClassName="h-8 border border-paper-2/20 bg-transparent px-2 text-[11px] uppercase tracking-[0.06em] text-paper"
                />
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap justify-between gap-3.5 border-t border-paper-2/10 pt-6 text-xs tracking-[0.04em] text-paper-2/50">
          <span>
            © 1998–{year} Thanka Treasure. Painted by hand in Nepal.
          </span>
          <span className="flex gap-3">
            <Link
              href="/pages/privacy-policy"
              className="hover:text-paper-2/80"
            >
              Privacy
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              href="/pages/terms-of-service"
              className="hover:text-paper-2/80"
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
            <Link href={link.href} className="hover:text-gold-light">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
