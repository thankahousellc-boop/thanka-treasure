"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/admin/ui/icons";

import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";
import type { NavBadges } from "./nav-config";

type MobileShellProps = {
  badges: NavBadges;
  brandName: string;
};

export function MobileShell({ badges, brandName }: MobileShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [previousPathname, setPreviousPathname] = useState(pathname);

  if (previousPathname !== pathname) {
    setPreviousPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open admin navigation"
        className="grid h-11 w-11 place-items-center rounded-md text-(--admin-text-soft) hover:bg-(--admin-accent-soft) hover:text-(--admin-text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--admin-accent) lg:hidden"
      >
        <Icon.Menu />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close admin navigation"
            onClick={() => setOpen(false)}
            className="flex-1 bg-black/50 backdrop-blur-sm"
          />
          <aside className="flex h-full w-72 max-w-[85vw] flex-col border-l border-(--admin-border) bg-(--admin-surface)">
            <div className="flex items-center justify-between gap-2 border-b border-(--admin-border) px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-(--admin-text-mute)">
                {brandName}
              </p>
              <div className="flex items-center gap-1.5">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="grid h-10 w-10 place-items-center rounded-md text-(--admin-text-soft) hover:bg-(--admin-accent-soft) hover:text-(--admin-text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--admin-accent)"
                >
                  <Icon.Close />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <SidebarNav badges={badges} onNavigate={() => setOpen(false)} />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
