"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navGroups } from "./nav-config";

const labelOverrides: Record<string, string> = {
  admin: "Admin",
  new: "New",
  edit: "Edit",
};

const navLabelByHref: Record<string, string> = navGroups
  .flatMap((group) => group.items)
  .reduce<Record<string, string>>((map, item) => {
    map[item.href] = item.label;
    return map;
  }, {});

function humanise(segment: string) {
  if (labelOverrides[segment]) return labelOverrides[segment];
  if (/^[0-9a-f-]{8,}$/i.test(segment)) return "Detail";
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function findDeepestNavHref(pathname: string) {
  let best = "";
  for (const href of Object.keys(navLabelByHref)) {
    if (href === "/admin") continue;
    const matches = pathname === href || pathname.startsWith(`${href}/`);
    if (matches && href.length > best.length) {
      best = href;
    }
  }
  return best;
}

export function AdminBreadcrumbs() {
  const pathname = usePathname() ?? "/admin";
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0 || segments[0] !== "admin") return null;

  const dashboardCrumb = {
    href: "/admin",
    label: navLabelByHref["/admin"] ?? "Dashboard",
  };

  if (pathname === "/admin") {
    return renderCrumbs([{ ...dashboardCrumb, isLast: true }]);
  }

  const navHref = findDeepestNavHref(pathname);
  const navSegments = navHref ? navHref.split("/").filter(Boolean) : ["admin"];
  const tailSegments = segments.slice(navSegments.length);

  const crumbs: Array<{ href: string; label: string; isLast: boolean }> = [];
  crumbs.push({ ...dashboardCrumb, isLast: false });

  if (navHref) {
    crumbs.push({
      href: navHref,
      label: navLabelByHref[navHref] ?? humanise(navSegments[navSegments.length - 1]!),
      isLast: tailSegments.length === 0,
    });
  }

  tailSegments.forEach((segment, index) => {
    const href =
      "/" + [...navSegments, ...tailSegments.slice(0, index + 1)].join("/");
    crumbs.push({
      href,
      label: humanise(segment),
      isLast: index === tailSegments.length - 1,
    });
  });

  return renderCrumbs(crumbs);
}

function renderCrumbs(
  crumbs: Array<{ href: string; label: string; isLast: boolean }>,
) {

  return (
    <nav
      aria-label="Breadcrumb"
      className="text-xs"
      style={{ color: "var(--admin-text-mute)" }}
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center gap-1.5">
            {index > 0 ? (
              <span style={{ color: "var(--admin-text-mute)", opacity: 0.6 }}>
                /
              </span>
            ) : null}
            {crumb.isLast ? (
              <span
                className="font-medium"
                style={{ color: "var(--admin-text)" }}
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:underline"
                style={{ color: "var(--admin-text-soft)" }}
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
