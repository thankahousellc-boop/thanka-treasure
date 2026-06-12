"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { CurrencySelector } from "@/components/shop/currency-selector";

type MobileMenuLink = {
  href: string;
  label: string;
};

type MobileMenuProps = {
  links: MobileMenuLink[];
  currency: string;
  brandName: string;
};

export function MobileMenu({ links, currency, brandName }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [previousPathname, setPreviousPathname] = useState(pathname);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Close on route change.
  if (previousPathname !== pathname) {
    setPreviousPathname(pathname);
    setOpen(false);
  }

  // Lock body scroll, close on Escape, focus the panel while open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="grid h-11 w-11 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="flex-1 bg-ink/35 backdrop-blur-sm"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="flex h-full w-80 max-w-[85vw] flex-col bg-paper shadow-(--shadow-2) outline-none"
          >
            <div className="flex items-center justify-between border-b border-(--line-soft) px-5 py-4">
              <span
                id={titleId}
                className="font-serif text-[15px] uppercase tracking-[0.2em] text-ink"
              >
                {brandName}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="grid h-11 w-11 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <nav
              aria-label="Mobile"
              className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
            >
              {links.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center rounded-md px-3 text-[15px] uppercase tracking-[0.08em] transition-colors ${
                      active
                        ? "bg-paper-2 font-medium text-ink"
                        : "text-ink-soft hover:bg-paper-2 hover:text-ink"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <Link
                href="/account"
                aria-current={isActive("/account") ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-md px-3 text-[15px] uppercase tracking-[0.08em] transition-colors ${
                  isActive("/account")
                    ? "bg-paper-2 font-medium text-ink"
                    : "text-ink-soft hover:bg-paper-2 hover:text-ink"
                }`}
              >
                Account
              </Link>
            </nav>

            <div className="border-t border-(--line-soft) px-5 py-4">
              <CurrencySelector
                selectedCurrency={currency}
                className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.08em] text-ink-soft"
                labelClassName="text-ink-mute"
                selectClassName="h-9 rounded-md border border-(--line) bg-paper px-2 text-[13px] tracking-[0.06em] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
