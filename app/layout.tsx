import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";

import { brandingToCssVariables, getBranding } from "@/lib/branding";
import { getSiteUrl } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();

  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: "Thangka Treasure",
      template: "%s | Thangka Treasure",
    },
    description:
      "A modern storefront and admin platform for authentic Tibetan Thangka art.",
    icons: {
      icon: branding.faviconUrl ?? "/favicon.svg",
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "Thangka Treasure",
      title: "Thangka Treasure",
      description:
        "A modern storefront and admin platform for authentic Tibetan Thangka art.",
      url: getSiteUrl(),
    },
    twitter: {
      card: "summary_large_image",
      title: "Thangka Treasure",
      description:
        "A modern storefront and admin platform for authentic Tibetan Thangka art.",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await getBranding();
  const cssVariables = brandingToCssVariables(branding);

  return (
    <html
      lang="en"
      className={`${inter.variable} ${cormorant.variable} antialiased`}
    >
      <head>
        {/* Branding overrides — applied last so they win over the @theme defaults. */}
        <style>{`:root{${cssVariables}}`}</style>
      </head>
      <body className="min-h-screen bg-bg-primary text-text-primary">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
