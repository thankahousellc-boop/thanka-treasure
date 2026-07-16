import { redirect } from "next/navigation";
import { Toaster } from "sonner";

import { auth } from "@/lib/auth";
import { getAdminTheme } from "@/lib/admin-theme.server";
import { getBranding } from "@/lib/branding";

import { KioskTopbar } from "./kiosk-topbar";

export const dynamic = "force-dynamic";

export default async function PosLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [session, theme, branding] = await Promise.all([
    auth.getSession(),
    getAdminTheme(),
    getBranding(),
  ]);

  if (!session.user) {
    redirect("/auth/login?next=%2Fpos");
  }

  if (session.user.role !== "admin") {
    redirect("/account");
  }

  return (
    <div
      // Reuse the admin token surface so every --admin-* variable resolves.
      className="admin-app flex min-h-dvh flex-col"
      data-theme={theme ?? undefined}
    >
      {/* First-visit OS-preference fallback lives in the root layout's
          BootstrapScript, which stamps data-theme on <html> before paint. */}
      <KioskTopbar
        brandName={branding.brandName}
        logoUrl={branding.logoLightUrl}
      />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-3 md:px-5 md:py-4"
      >
        {children}
      </main>
      <Toaster richColors position="top-center" closeButton />
    </div>
  );
}
