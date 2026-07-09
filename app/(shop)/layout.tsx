import { AnnouncementBar } from "@/components/shop/announcement-bar";
import { CartDrawer } from "@/components/shop/cart-drawer";
import { CurrencyProvider } from "@/components/shop/currency-provider";
import { ShopFooter } from "@/components/shop/footer";
import { ShopHeader } from "@/components/shop/header";
import { WhatsAppButton } from "@/components/shop/whatsapp-button";
import { GoogleAnalytics } from "@next/third-parties/google";
import { getExchangeRates } from "@/lib/currency/context";
import {
  getStoreContact,
  getStorefront,
  normalizeWhatsAppNumber,
} from "@/lib/site-settings";

// Currency selection lives entirely on the client now (cookie + <Price>). The
// layout only needs exchange rates, which are cache-backed and read no
// cookies/headers — so every storefront route stays statically renderable /
// ISR instead of being forced dynamic on every request.
export default async function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [rates, contact, storefront] = await Promise.all([
    getExchangeRates(),
    getStoreContact(),
    getStorefront(),
  ]);

  const whatsappDigits = normalizeWhatsAppNumber(contact.whatsapp);

  return (
    <CurrencyProvider rates={rates}>
      {/* Set the currency attribute from the cookie before paint so CSS-toggled
          prices render in the visitor's currency with no flash. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "(function(){try{var m=document.cookie.match(/(?:^|;\\s*)tt_currency=([^;]+)/);if(m){document.documentElement.dataset.currency=decodeURIComponent(m[1]).toUpperCase();}}catch(e){}})();",
        }}
      />
      <div className="flex min-h-dvh flex-col bg-bg-primary">
        <AnnouncementBar messages={storefront.announcementMessages} />
        <ShopHeader />
        <main id="main-content" tabIndex={-1} className="flex-1">
          {children}
        </main>
        <ShopFooter contact={contact} />
        {whatsappDigits ? <WhatsAppButton phoneNumber={whatsappDigits} /> : null}
        <CartDrawer />
        <GoogleAnalytics gaId="G-TG802Y89CS" />
      </div>
    </CurrencyProvider>
  );
}
