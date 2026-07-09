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
      className="hidden h-screen w-56 shrink-0 flex-col lg:sticky lg:top-0 lg:flex"
      style={{
        background: "var(--admin-surface)",
        borderRight: "1px solid var(--admin-border)",
      }}
    >
      <SidebarBrand branding={branding} />
      <div className="flex-1 overflow-y-auto px-2.5 py-3">
        <SidebarNav badges={badges} />
      </div>
      <div
        className="px-4 py-2 text-[10px] uppercase tracking-[0.14em]"
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
      className="flex items-center gap-2.5 px-4 py-3 transition hover:opacity-90"
      style={{ borderBottom: "1px solid var(--admin-border)" }}
    >
      {branding.logoLightUrl ? (
        <Image
          src={branding.logoLightUrl}
          alt={branding.brandName}
          width={28}
          height={28}
          className="h-7 w-7 rounded object-contain"
          unoptimized
        />
      ) : (
        <span
          className="grid h-7 w-7 place-items-center rounded text-[12px] font-semibold"
          style={{
            backgroundColor: "var(--admin-accent)",
            color: "var(--admin-on-accent)",
          }}
        >
          {branding.brandName.charAt(0)}
        </span>
      )}
      <div className="min-w-0">
        <p
          className="truncate text-[13px] font-semibold leading-tight"
          style={{ color: "var(--admin-text)" }}
        >
          {branding.brandName}
        </p>
        <p
          className="truncate text-[9.5px] uppercase tracking-[0.18em]"
          style={{ color: "var(--admin-text-mute)" }}
        >
          Admin
        </p>
      </div>
    </Link>
  );
}
