import type { ComponentType, SVGProps } from "react";

import { Icon } from "@/components/admin/ui/icons";

export type NavBadgeKey =
  | "ordersToFulfill"
  | "messages"
  | "subscribers"
  | "lowStock";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  badgeKey?: NavBadgeKey;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: Icon.Dashboard },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/pos", label: "Point of sale", icon: Icon.Bag },
      {
        href: "/admin/orders",
        label: "Orders",
        icon: Icon.Bag,
        badgeKey: "ordersToFulfill",
      },
      { href: "/admin/discounts", label: "Discounts", icon: Icon.Discount },
      { href: "/admin/customers", label: "Customers", icon: Icon.Users },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: Icon.Box },
      {
        href: "/admin/products/inventory",
        label: "Inventory",
        icon: Icon.Layers,
        badgeKey: "lowStock",
      },
      {
        href: "/admin/products/categories",
        label: "Categories",
        icon: Icon.Tag,
      },
      {
        href: "/admin/products/attributes",
        label: "Attributes",
        icon: Icon.Layers,
      },
      { href: "/admin/frames", label: "Frames", icon: Icon.Frame },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/blog", label: "Blog", icon: Icon.Doc },
      { href: "/admin/pages", label: "Pages", icon: Icon.Doc },
      {
        href: "/admin/messages",
        label: "Messages",
        icon: Icon.Mail,
        badgeKey: "messages",
      },
      {
        href: "/admin/subscribers",
        label: "Subscribers",
        icon: Icon.Megaphone,
        badgeKey: "subscribers",
      },
      { href: "/admin/reviews", label: "Reviews", icon: Icon.Star },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/admin/settings", label: "Site settings", icon: Icon.Settings },
      {
        href: "/admin/settings/branding",
        label: "Branding",
        icon: Icon.Brush,
      },
      {
        href: "/admin/settings/barcode",
        label: "Barcodes",
        icon: Icon.Tag,
      },
    ],
  },
];

export type NavBadges = Partial<Record<NavBadgeKey, number>>;
