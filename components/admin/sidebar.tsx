import Image from "next/image";
import Link from "next/link";

import { getBranding } from "@/lib/branding";
import { loadAdminBadges } from "@/lib/admin-shell-data";

import { SidebarNav } from "./sidebar-nav";

export async function AdminSidebar() {
  const [badges, branding] = await Promise.all([
    loadAdminBadges(),
    getBranding(),
  ]);

  return (
    <aside
      className="hidden h-screen w-64 shrink-0 flex-col lg:sticky lg:top-0 lg:flex"
      style={{
        background: "var(--admin-surface)",
        borderRight: "1px solid var(--admin-border)",
      }}
    >
      <SidebarBrand branding={branding} />
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav badges={badges} />
      </div>
      <div
        className="px-5 py-3 text-[10.5px] uppercase tracking-[0.14em]"
        style={{
          color: "var(--admin-text-mute)",
          borderTop: "1px solid var(--admin-border)",
        }}
      >
        v0.1 · admin console
      </div>
    </aside>
  );
}

function SidebarBrand({ branding }: { branding: Awaited<ReturnType<typeof getBranding>> }) {
  return (
    <Link
      href="/admin"
      className="flex items-center gap-3 px-5 py-5 transition hover:opacity-90"
      style={{ borderBottom: "1px solid var(--admin-border)" }}
    >
      {branding.logoLightUrl ? (
        <Image
          src={branding.logoLightUrl}
          alt={branding.brandName}
          width={36}
          height={36}
          className="h-9 w-9 rounded object-contain"
          unoptimized
        />
      ) : (
        <span
          className="grid h-9 w-9 place-items-center rounded text-sm font-semibold"
          style={{
            backgroundColor: "var(--admin-accent)",
            color: "#fff",
          }}
        >
          {branding.brandName.charAt(0)}
        </span>
      )}
      <div className="min-w-0">
        <p
          className="admin-display truncate text-[17px] font-medium"
          style={{ color: "var(--admin-text)" }}
        >
          {branding.brandName}
        </p>
        <p
          className="truncate text-[10px] uppercase tracking-[0.18em]"
          style={{ color: "var(--admin-text-mute)" }}
        >
          Admin
        </p>
      </div>
    </Link>
  );
}
