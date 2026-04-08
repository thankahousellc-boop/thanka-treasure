import Link from "next/link";

import { contactRepository } from "@/lib/repositories/contact-repository";
import { newsletterRepository } from "@/lib/repositories/newsletter-repository";

type SidebarItem = {
  href: string;
  label: string;
  badge?: number;
};

async function getSidebarItems(): Promise<SidebarItem[]> {
  let messageBadge = 0;
  let subscriberBadge = 0;

  try {
    const [messageStats, subscriberStats] = await Promise.all([
      contactRepository.getAdminStats(),
      newsletterRepository.getAdminStats(),
    ]);

    messageBadge = messageStats.newCount;
    subscriberBadge = subscriberStats.activeCount;
  } catch {
    messageBadge = 0;
    subscriberBadge = 0;
  }

  return [
    { href: "/admin", label: "Overview" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/products", label: "Products" },
    { href: "/admin/products/inventory", label: "Inventory" },
    { href: "/admin/products/categories", label: "Catalog taxonomy" },
    { href: "/admin/blog", label: "Blog" },
    { href: "/admin/customers", label: "Customers" },
    { href: "/admin/discounts", label: "Discounts" },
    { href: "/admin/analytics", label: "Analytics" },
    { href: "/admin/messages", label: "Messages", badge: messageBadge },
    {
      href: "/admin/subscribers",
      label: "Subscribers",
      badge: subscriberBadge,
    },
    { href: "/admin/pages", label: "Pages" },
    { href: "/admin/settings", label: "Settings" },
  ];
}

export async function AdminSidebar() {
  const items = await getSidebarItems();

  return (
    <aside className="hidden w-64 border-r border-zinc-200 bg-zinc-50 p-5 lg:block">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Thangka Admin
      </p>
      <nav aria-label="Admin sections" className="mt-5 space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between rounded px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-200"
          >
            <span>{item.label}</span>
            {item.badge && item.badge > 0 ? (
              <span
                aria-label={`${item.badge} unread`}
                className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-white"
              >
                {item.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
