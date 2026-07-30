"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/admin/ui/icons";
import { SubmitButton } from "@/components/ui/submit-button";

type UserMenuProps = {
  email: string;
  signOutAction: () => Promise<void>;
};

export function UserMenu({ email, signOutAction }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = email.charAt(0).toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:opacity-90"
        style={{
          background: "var(--admin-surface)",
          border: "1px solid var(--admin-border-strong)",
          color: "var(--admin-text-soft)",
        }}
      >
        <span
          className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold"
          style={{
            backgroundColor: "var(--admin-accent)",
            color: "var(--admin-on-accent)",
          }}
        >
          {initial}
        </span>
        <span className="hidden max-w-[14ch] truncate sm:inline">{email}</span>
        <Icon.ChevronDown
          width={14}
          height={14}
          style={{ color: "var(--admin-text-mute)" }}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-lg"
          style={{
            background: "var(--admin-surface)",
            border: "1px solid var(--admin-border)",
            boxShadow: "var(--admin-shadow-lg)",
          }}
        >
          <div
            className="px-3 py-3"
            style={{ borderBottom: "1px solid var(--admin-border)" }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: "var(--admin-text-mute)" }}
            >
              Signed in
            </p>
            <p
              className="mt-0.5 truncate text-sm"
              style={{ color: "var(--admin-text)" }}
            >
              {email}
            </p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2.5 text-sm transition hover:bg-(--admin-accent-soft)"
            style={{ color: "var(--admin-text-soft)" }}
          >
            <Icon.Layers width={14} height={14} /> View storefront
          </Link>
          <form action={signOutAction}>
            <SubmitButton
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition enabled:hover:bg-(--admin-danger)/10"
              style={{ color: "var(--admin-danger)" }}
              pendingLabel="Signing out…"
            >
              <Icon.Logout width={14} height={14} /> Sign out
            </SubmitButton>
          </form>
        </div>
      ) : null}
    </div>
  );
}
