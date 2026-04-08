import type { Metadata } from "next";
import { Inter, Lora, Playfair_Display } from "next/font/google";
import { getSiteUrl } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Thangka Treasure",
    template: "%s | Thangka Treasure",
  },
  description:
    "A modern storefront and admin platform for authentic Tibetan Thangka art.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${lora.variable} ${playfair.variable} antialiased`}
    >
      <body className="min-h-screen bg-bg-primary text-text-primary">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
