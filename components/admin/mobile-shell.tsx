"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/admin/ui/icons";

import { SidebarNav } from "./sidebar-nav";
import type { NavBadges } from "./nav-config";

type MobileShellProps = {
  badges: NavBadges;
  brandName: string;
};

export function MobileShell({ badges, brandName }: MobileShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
        className="grid h-9 w-9 place-items-center rounded-md text-zinc-700 hover:bg-zinc-100 lg:hidden"
      >
        <Icon.Menu />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close admin navigation"
            onClick={() => setOpen(false)}
            className="flex-1 bg-zinc-900/40 backdrop-blur-sm"
          />
          <aside className="flex h-full w-72 max-w-[85vw] flex-col border-l border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                {brandName}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100"
              >
                <Icon.Close />
              </button>
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
