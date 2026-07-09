"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ThemeToggle } from "@/components/admin/theme-toggle";
import { Icon } from "@/components/admin/ui";

function LiveClock() {
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  // Reserve width so the clock appearing post-hydration doesn't shift layout.
  return (
    <span
      className="hidden min-w-16 text-right text-base font-semibold tabular-nums sm:inline"
      style={{ color: "var(--admin-text-soft)" }}
      aria-hidden={now === ""}
    >
      {now}
    </span>
  );
}

export function KioskTopbar({
  brandName,
  logoUrl,
}: {
  brandName: string;
  logoUrl: string | null;
}) {
  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 px-4 md:px-6"
      style={{
        background: "var(--admin-surface)",
        borderBottom: "1px solid var(--admin-border)",
      }}
    >
      <div className="flex min-w-0 items-center gap-3">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={brandName}
            width={36}
            height={36}
            className="h-9 w-9 rounded object-contain"
            unoptimized
          />
        ) : (
          <span
            className="grid h-9 w-9 place-items-center rounded text-base font-semibold"
            style={{
              backgroundColor: "var(--admin-accent)",
              color: "var(--admin-on-accent)",
            }}
          >
            {brandName.charAt(0)}
          </span>
        )}
        <div className="min-w-0">
          <p
            className="truncate text-lg font-semibold leading-tight"
            style={{ color: "var(--admin-text)" }}
          >
            {brandName}
          </p>
          <p
            className="truncate text-xs uppercase tracking-[0.18em]"
            style={{ color: "var(--admin-text-mute)" }}
          >
            Point of sale
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <LiveClock />
        <ThemeToggle />
        <Link
          href="/admin"
          className="inline-flex h-11 items-center gap-2 rounded-md px-3.5 text-sm font-medium transition hover:bg-(--admin-accent-soft)"
          style={{
            color: "var(--admin-text-soft)",
            border: "1px solid var(--admin-border-strong)",
          }}
        >
          <Icon.Logout width={18} height={18} />
          <span className="hidden sm:inline">Exit to admin</span>
        </Link>
      </div>
    </header>
  );
}
