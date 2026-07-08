import { FlashToast } from "@/components/admin/flash-toast";
import {
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  Icon,
  StatCard,
} from "@/components/admin/ui";
import { discountRepository } from "@/lib/repositories/discount-repository";

import { DiscountsTable } from "./discounts-table";

export default async function AdminDiscountsPage() {
  const [stats, discounts] = await Promise.all([
    discountRepository.getAdminStats(),
    discountRepository.listForAdmin(250),
  ]);

  return (
    <section className="space-y-5">
      <FlashToast
        messages={{
          created: "Discount created.",
          activated: "Discount activated.",
          deactivated: "Discount deactivated.",
        }}
      />
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className="admin-display text-2xl font-semibold"
            style={{ color: "var(--admin-text)" }}
          >
            Discounts
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--admin-text-soft)" }}
          >
            Manage promo codes and automatic discounts.
          </p>
        </div>
        <ButtonLink href="/admin/discounts/new">
          <Icon.Plus width={14} height={14} />
          <span>New discount</span>
        </ButtonLink>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total codes" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Usage limit reached" value={stats.exhausted} />
      </div>

      <Card>
        <CardHeader
          title="All discounts"
          description="Toggle status to enable or disable a code without deleting it."
        />
        {discounts.length > 0 ? (
          <DiscountsTable rows={discounts} />
        ) : (
          <CardBody>
            <p
              className="text-sm"
              style={{ color: "var(--admin-text-soft)" }}
            >
              No discount codes yet. Create one to enable promotions.
            </p>
          </CardBody>
        )}
      </Card>
    </section>
  );
}
