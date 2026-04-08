import { AnnouncementBar } from "@/components/shop/announcement-bar";
import { ShopFooter } from "@/components/shop/footer";
import { ShopHeader } from "@/components/shop/header";
import { WhatsAppButton } from "@/components/shop/whatsapp-button";
import { getCurrencyContext } from "@/lib/currency/context";

export default async function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { currency } = await getCurrencyContext();

  return (
    <div className="min-h-screen bg-bg-primary">
      <AnnouncementBar />
      <ShopHeader currency={currency} />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <ShopFooter currency={currency} />
      <WhatsAppButton
        phoneNumber={process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "9779800000000"}
      />
    </div>
  );
}
