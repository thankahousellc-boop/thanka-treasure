"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { Icon } from "@/components/admin/ui";

import { archiveProductAction, setProductStatusAction } from "./actions";

type ProductStatus = "draft" | "active" | "archived";

type ProductRowMenuProps = {
  productId: string;
  status: ProductStatus;
  productTitle: string;
};

const MENU_WIDTH = 224;
const MENU_GAP = 6;

export function ProductRowMenu({
  productId,
  status,
  productTitle,
}: ProductRowMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const top = rect.bottom + MENU_GAP;
    const rawLeft = rect.right - MENU_WIDTH;
    const left = Math.max(8, Math.min(rawLeft, window.innerWidth - MENU_WIDTH - 8));
    setPosition({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (open) {
      updatePosition();
    }
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    function handlePointer(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function handleReposition() {
      updatePosition();
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open, updatePosition]);

  const close = () => setOpen(false);

  const portalTarget =
    typeof document !== "undefined"
      ? (document.querySelector(".admin-app") as HTMLElement | null) ??
        document.body
      : null;

  const menu =
    open && position && portalTarget
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="overflow-hidden rounded-lg"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: MENU_WIDTH,
              zIndex: 1000,
              background: "var(--admin-surface)",
              border: "1px solid var(--admin-border-strong)",
              boxShadow: "var(--admin-shadow-lg)",
            }}
          >
            <Link
              href={`/admin/products/${productId}`}
              role="menuitem"
              onClick={close}
              className="flex items-center gap-2 px-3 py-2 text-sm transition"
              style={{ color: "var(--admin-text)" }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor =
                  "var(--admin-accent-soft)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <Icon.Doc width={15} height={15} />
              <span>Open</span>
            </Link>

            <div
              aria-hidden="true"
              style={{ borderTop: "1px solid var(--admin-border)" }}
            />

            {status !== "active" ? (
              <StatusMenuItem
                productId={productId}
                status="active"
                label="Publish (Active)"
                icon={<Icon.Eye width={15} height={15} />}
                onSelect={close}
              />
            ) : null}

            {status !== "draft" ? (
              <StatusMenuItem
                productId={productId}
                status="draft"
                label="Move to draft"
                icon={<Icon.EyeOff width={15} height={15} />}
                onSelect={close}
              />
            ) : null}

            {status !== "archived" ? (
              <>
                <div
                  aria-hidden="true"
                  style={{ borderTop: "1px solid var(--admin-border)" }}
                />
                <form action={archiveProductAction}>
                  <input type="hidden" name="id" value={productId} />
                  <button
                    type="submit"
                    role="menuitem"
                    onClick={close}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition"
                    style={{ color: "#b3261e" }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.backgroundColor =
                        "rgba(179, 38, 30, 0.08)";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <Icon.Archive width={15} height={15} />
                    <span>Archive</span>
                  </button>
                </form>
              </>
            ) : null}
          </div>,
          portalTarget,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${productTitle}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md transition"
        style={{
          color: "var(--admin-text-soft)",
          backgroundColor: open ? "var(--admin-accent-soft)" : "transparent",
        }}
        onMouseEnter={(event) => {
          if (!open) {
            event.currentTarget.style.backgroundColor =
              "var(--admin-accent-soft)";
          }
        }}
        onMouseLeave={(event) => {
          if (!open) {
            event.currentTarget.style.backgroundColor = "transparent";
          }
        }}
      >
        <Icon.MoreVertical />
      </button>
      {menu}
    </>
  );
}

type StatusMenuItemProps = {
  productId: string;
  status: ProductStatus;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
};

function StatusMenuItem({
  productId,
  status,
  label,
  icon,
  onSelect,
}: StatusMenuItemProps) {
  return (
    <form action={setProductStatusAction}>
      <input type="hidden" name="id" value={productId} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        role="menuitem"
        onClick={onSelect}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition"
        style={{ color: "var(--admin-text)" }}
        onMouseEnter={(event) => {
          event.currentTarget.style.backgroundColor =
            "var(--admin-accent-soft)";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        {icon}
        <span>{label}</span>
      </button>
    </form>
  );
}
