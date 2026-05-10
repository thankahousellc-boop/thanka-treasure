import { adminSignOutAction } from "@/app/(admin)/admin/actions";
import { auth } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { loadAdminBadges } from "@/lib/admin-shell-data";

import { AdminBreadcrumbs } from "./breadcrumbs";
import { MobileShell } from "./mobile-shell";
import { UserMenu } from "./user-menu";

export async function AdminTopbar() {
  const [session, badges, branding] = await Promise.all([
    auth.getSession(),
    loadAdminBadges(),
    getBranding(),
  ]);

  const email = session.user?.email ?? "admin";

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 px-5 backdrop-blur md:px-8"
      style={{
        background: "rgba(255, 255, 255, 0.85)",
        borderBottom: "1px solid var(--admin-border)",
      }}
    >
      <div className="flex items-center gap-3">
        <MobileShell badges={badges} brandName={branding.brandName} />
        <AdminBreadcrumbs />
      </div>
      <div className="flex items-center gap-2">
        <UserMenu email={email} signOutAction={adminSignOutAction} />
      </div>
    </header>
  );
}
