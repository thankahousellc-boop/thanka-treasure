import { redirect } from "next/navigation";
import { Toaster } from "sonner";

import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/topbar";
import { auth } from "@/lib/auth";
import { getAdminTheme } from "@/lib/admin-theme.server";

export const dynamic = "force-dynamic";

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
      {/* First-visit OS-preference fallback lives in the root layout's
          BootstrapScript, which stamps data-theme on <html> before paint. */}
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
