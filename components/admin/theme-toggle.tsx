"use client";

import { useEffect, useState } from "react";

import { ADMIN_THEME_COOKIE, type AdminTheme } from "@/lib/admin-theme";

import { Icon } from "./ui/icons";

function getShellEl(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(".admin-app");
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<AdminTheme | null>(null);

  // Resolve the active theme from the DOM after hydration (the no-flash
  // script may have set it client-side when no cookie was present).
  useEffect(() => {
    // Returning users carry the attribute on the shell (server-rendered from
    // the cookie); first-time visitors only have it on <html> (set by the
    // no-flash script). Fall back to the OS preference if neither is present.
    const current =
      getShellEl()?.getAttribute("data-theme") ??
      document.documentElement.getAttribute("data-theme") ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: AdminTheme = theme === "dark" ? "light" : "dark";
    const el = getShellEl();
    if (el) el.setAttribute("data-theme", next);
    document.cookie = `${ADMIN_THEME_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    setTheme(next);
  }

  const isDark = theme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className={`grid h-9 w-9 place-items-center rounded-md transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--admin-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--admin-bg) ${className}`}
      style={{
        color: "var(--admin-text-soft)",
        border: "1px solid var(--admin-border)",
        background: "var(--admin-surface)",
      }}
    >
      {/* Render nothing until resolved to avoid a flash of the wrong glyph. */}
      {theme === null ? (
        <span className="h-[18px] w-[18px]" />
      ) : isDark ? (
        <Icon.Sun width={18} height={18} />
      ) : (
        <Icon.Moon width={18} height={18} />
      )}
    </button>
  );
}
