import { redirect } from "next/navigation";
import Script from "next/script";
import { Toaster } from "sonner";

import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/topbar";
import { auth } from "@/lib/auth";
import { ADMIN_THEME_COOKIE } from "@/lib/admin-theme";
import { getAdminTheme } from "@/lib/admin-theme.server";

export const dynamic = "force-dynamic";

// Runs before paint when no cookie is set: adopt the OS preference and
// persist it so the server can render data-theme directly on later visits.
// Hoisted into <head> by next/script (beforeInteractive), so it sets the
// attribute on <html>; CSS bridges that to the as-yet-unattributed shell.
const NO_FLASH_SCRIPT = `(function(){try{if(/(^|;)\\s*${ADMIN_THEME_COOKIE}=/.test(document.cookie))return;var dark=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=dark?'dark':'light';document.documentElement.setAttribute('data-theme',t);document.cookie='${ADMIN_THEME_COOKIE}='+t+';path=/;max-age=31536000;samesite=lax';}catch(e){}})();`;

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [session, theme] = await Promise.all([
    auth.getSession(),
    getAdminTheme(),
  ]);

  if (!session.user) {
    redirect("/auth/login?next=%2Fadmin");
  }

  if (session.user.role !== "admin") {
    redirect("/account");
  }

  return (
    <div
      className="admin-app flex min-h-screen"
      data-theme={theme ?? undefined}
    >
      <Script
        id="admin-no-flash-theme"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }}
      />
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-350 flex-1 space-y-4 px-4 py-4 md:px-6 md:py-5"
        >
          {children}
        </main>
      </div>
      <Toaster richColors position="top-right" closeButton />
    </div>
  );
}
