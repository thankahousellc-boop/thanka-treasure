"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Icon } from "@/components/admin/ui";
import type { AttributeFacet } from "@/lib/repositories/attribute-repository";

type ProductsFilterBarProps = {
  facets: AttributeFacet[];
  // Active values keyed by attribute definition key, e.g. { "artist": ["Pad"] }.
  active: Record<string, string[]>;
};

export function ProductsFilterBar({ facets, active }: ProductsFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close the open dropdown on outside click or Escape.
  useEffect(() => {
    if (!openKey) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpenKey(null);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenKey(null);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openKey]);

  function commit(params: URLSearchParams) {
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  // Toggle a single value for an attribute key (OR within a key, AND across).
  function toggleValue(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const param = `attr_${key}`;
    const existing = params.getAll(param);
    params.delete(param);
    let removed = false;
    for (const current of existing) {
      if (current === value) {
        removed = true;
        continue;
      }
      params.append(param, current);
    }
    if (!removed) params.append(param, value);
    commit(params);
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    for (const facet of facets) params.delete(`attr_${facet.definition.key}`);
    commit(params);
  }

  const activeChips = facets.flatMap((facet) =>
    (active[facet.definition.key] ?? []).map((value) => ({
      key: facet.definition.key,
      label: facet.definition.name,
      value,
    })),
  );
  const hasActive = activeChips.length > 0;

  if (facets.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-3 px-4 py-3"
      style={{
        borderBottom: "1px solid var(--admin-border)",
        background: "var(--admin-surface-2)",
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 pr-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--admin-text-mute)" }}
        >
          <Icon.Tag width={13} height={13} />
          Filter
        </span>

        {facets.map((facet) => {
          const key = facet.definition.key;
          const selected = active[key] ?? [];
          const isOpen = openKey === key;
          return (
            <div key={facet.definition.id} className="relative">
              <button
                type="button"
                onClick={() => setOpenKey(isOpen ? null : key)}
                aria-expanded={isOpen}
                aria-haspopup="true"
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-medium transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--admin-accent)"
                style={{
                  background:
                    selected.length > 0
                      ? "var(--admin-accent-soft)"
                      : "var(--admin-surface)",
                  border: `1px solid ${selected.length > 0 ? "var(--admin-accent)" : "var(--admin-border-strong)"}`,
                  color: "var(--admin-text)",
                }}
              >
                <span>{facet.definition.name}</span>
                {selected.length > 0 ? (
                  <span
                    className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums"
                    style={{
                      background: "var(--admin-accent)",
                      color: "var(--admin-on-accent)",
                    }}
                  >
                    {selected.length}
                  </span>
                ) : null}
                <span
                  className="transition-transform"
                  style={{ transform: isOpen ? "rotate(180deg)" : undefined }}
                >
                  <Icon.ChevronDown width={13} height={13} />
                </span>
              </button>

              {isOpen ? (
                <div
                  role="menu"
                  className="absolute left-0 z-20 mt-1.5 max-h-72 w-60 overflow-y-auto rounded-lg p-1.5 shadow-xl"
                  style={{
                    background: "var(--admin-surface)",
                    border: "1px solid var(--admin-border-strong)",
                  }}
                >
                  {facet.options.map((option) => {
                    const checked = selected.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={checked}
                        onClick={() => toggleValue(key, option.value)}
                        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-xs transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--admin-accent)"
                        style={{
                          background: checked
                            ? "var(--admin-accent-soft)"
                            : "transparent",
                          color: "var(--admin-text)",
                        }}
                      >
                        <span
                          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded"
                          style={{
                            background: checked
                              ? "var(--admin-accent)"
                              : "transparent",
                            border: `1px solid ${checked ? "var(--admin-accent)" : "var(--admin-border-strong)"}`,
                            color: "var(--admin-on-accent)",
                          }}
                        >
                          {checked ? (
                            <Icon.Check width={11} height={11} />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {option.value}
                        </span>
                        <span
                          className="text-[10px] tabular-nums"
                          style={{ color: "var(--admin-text-mute)" }}
                        >
                          {option.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}

        {hasActive ? (
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--admin-accent)"
            style={{ color: "var(--admin-text-soft)" }}
          >
            <Icon.Close width={12} height={12} />
            Clear all
          </button>
        ) : null}
      </div>

      {hasActive ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <span
              key={`${chip.key}:${chip.value}`}
              className="inline-flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-1 text-[11px]"
              style={{
                background: "var(--admin-accent-soft)",
                border: "1px solid var(--admin-accent)",
                color: "var(--admin-text)",
              }}
            >
              <span style={{ color: "var(--admin-text-mute)" }}>
                {chip.label}:
              </span>
              <span className="font-medium">{chip.value}</span>
              <button
                type="button"
                onClick={() => toggleValue(chip.key, chip.value)}
                aria-label={`Remove ${chip.label} ${chip.value} filter`}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--admin-accent)"
                style={{ color: "var(--admin-text-soft)" }}
              >
                <Icon.Close width={11} height={11} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
