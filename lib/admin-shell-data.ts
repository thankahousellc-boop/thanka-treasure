import { cache } from "react";

import { adminDashboardRepository } from "@/lib/repositories/admin-dashboard-repository";

import type { NavBadges } from "@/components/admin/nav-config";

// React cache(): the sidebar and topbar both render in the same request,
// so we hit the DB once instead of twice for badge counts.
export const loadAdminBadges = cache(async (): Promise<NavBadges> => {
  try {
    const badges = await adminDashboardRepository.getBadges();
    return {
      ordersToFulfill: badges.ordersToFulfill,
      messages: badges.messages,
      subscribers: badges.subscribers,
      lowStock: badges.lowStock,
    };
  } catch {
    return {};
  }
});
