import { redirect } from "next/navigation";
import Script from "next/script";
import { Toaster } from "sonner";

import { auth } from "@/lib/auth";
import { ADMIN_THEME_COOKIE } from "@/lib/admin-theme";
import { getAdminTheme } from "@/lib/admin-theme.server";
import { getBranding } from "@/lib/branding";

import { KioskTopbar } from "./kiosk-topbar";

export const dynamic = "force-dynamic";

// Mirror of the admin shell's no-flash script: adopt the OS colour scheme on
// first visit and persist it so later renders carry data-theme directly.
const NO_FLASH_SCRIPT = `(function(){try{if(/(^|;)\\s*${ADMIN_THEME_COOKIE}=/.test(document.cookie))return;var dark=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=dark?'dark':'light';document.documentElement.setAttribute('data-theme',t);document.cookie='${ADMIN_THEME_COOKIE}='+t+';path=/;max-age=31536000;samesite=lax';}catch(e){}})();`;

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
      <Script
        id="pos-no-flash-theme"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }}
      />
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
