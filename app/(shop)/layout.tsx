import { AnnouncementBar } from "@/components/shop/announcement-bar";
import { CartDrawer } from "@/components/shop/cart-drawer";
import { ShopFooter } from "@/components/shop/footer";
import { ShopHeader } from "@/components/shop/header";
import { WhatsAppButton } from "@/components/shop/whatsapp-button";
import { GoogleAnalytics } from "@next/third-parties/google";
import { getCurrencyContext } from "@/lib/currency/context";
import {
  getStoreContact,
  getStorefront,
  normalizeWhatsAppNumber,
} from "@/lib/site-settings";

export default async function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [{ currency, rates }, contact, storefront] = await Promise.all([
    getCurrencyContext(),
    getStoreContact(),
    getStorefront(),
  ]);

  const whatsappDigits = normalizeWhatsAppNumber(contact.whatsapp);

  return (
    <div className="min-h-screen bg-bg-primary">
      <AnnouncementBar messages={storefront.announcementMessages} />
      <ShopHeader currency={currency} />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <ShopFooter currency={currency} contact={contact} />
      {whatsappDigits ? <WhatsAppButton phoneNumber={whatsappDigits} /> : null}
      <CartDrawer displayCurrency={currency} exchangeRates={rates} />
      <GoogleAnalytics gaId="G-TG802Y89CS" />
    </div>
  );
}
