import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { productRepository } from "@/lib/repositories/product-repository";

import { PosKiosk } from "./pos-kiosk";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  // The layout already guards, but the page renders in parallel — short-circuit
  // here too so the data fetch never runs (and throws) for a signed-out request.
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    redirect("/auth/login?next=%2Fpos");
  }

  const [initialProducts, branding] = await Promise.all([
    productRepository.listForPos({ limit: 40 }),
    getBranding(),
  ]);

  return (
    <PosKiosk
      initialProducts={initialProducts}
      brandName={branding.brandName}
    />
  );
}
