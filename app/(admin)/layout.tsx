import { Toaster } from "sonner";

import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/topbar";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="admin-app flex min-h-screen">
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
