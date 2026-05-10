"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  navGroups,
  type NavBadges,
  type NavItem,
} from "./nav-config";

function matchesPath(itemHref: string, pathname: string) {
  if (itemHref === "/admin") {
    return pathname === "/admin";
  }
  return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
}

function findActiveHref(pathname: string) {
  let best = "";
  for (const group of navGroups) {
    for (const item of group.items) {
      if (matchesPath(item.href, pathname) && item.href.length > best.length) {
        best = item.href;
      }
    }
  }
  return best;
}

type SidebarNavProps = {
  badges: NavBadges;
  onNavigate?: () => void;
};

export function SidebarNav({ badges, onNavigate }: SidebarNavProps) {
  const pathname = usePathname() ?? "";
  const activeHref = findActiveHref(pathname);

  return (
    <nav aria-label="Admin sections" className="flex flex-col gap-5">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p
            className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: "var(--admin-text-mute)" }}
          >
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={item.href === activeHref}
                badge={item.badgeKey ? badges[item.badgeKey] : undefined}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NavLink({
  item,
  active,
  badge,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  const ItemIcon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className="group flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] transition-colors"
        style={
          active
            ? {
                backgroundColor: "var(--admin-accent)",
                color: "#ffffff",
              }
            : {
                color: "var(--admin-text-soft)",
              }
        }
      >
        <ItemIcon
          width={16}
          height={16}
          style={{
            color: active ? "#ffffff" : "var(--admin-text-mute)",
          }}
        />
        <span className="flex-1 truncate">{item.label}</span>
        {badge && badge > 0 ? (
          <span
            aria-label={`${badge} items`}
            className="min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold"
            style={
              active
                ? {
                    backgroundColor: "rgba(255,255,255,0.22)",
                    color: "#fff",
                  }
                : {
                    backgroundColor: "var(--admin-accent)",
                    color: "#fff",
                  }
            }
          >
            {badge}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
