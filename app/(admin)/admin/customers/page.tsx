import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  StatCard,
} from "@/components/admin/ui";
import { customerRepository } from "@/lib/repositories/customer-repository";

import { CustomersTable } from "./customers-table";

type CustomersPageSearchParams = {
  q?: string | string[];
};

type AdminCustomersPageProps = {
  searchParams: Promise<CustomersPageSearchParams>;
};

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function AdminCustomersPage({
  searchParams,
}: AdminCustomersPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = readSingle(resolvedSearchParams.q)?.trim() ?? "";

  const [stats, customers] = await Promise.all([
    customerRepository.getAdminStats(),
    customerRepository.listForAdmin({
      query: query.length > 0 ? query : undefined,
      limit: 250,
    }),
  ]);

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className="admin-display text-2xl font-semibold"
            style={{ color: "var(--admin-text)" }}
          >
            Customers
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--admin-text-soft)" }}
          >
            Profiles, marketing opt-in status, and lifetime value.
          </p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total customers" value={stats.total} />
        <StatCard label="Repeat customers" value={stats.repeatCustomers} />
        <StatCard label="Marketing opt-ins" value={stats.marketingOptIns} />
        <StatCard
          label="High-value (>$500)"
          value={stats.highValueCustomers}
        />
      </div>

      <Card>
        <CardHeader title="Filters" />
        <CardBody>
          <form className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex-1 space-y-1">
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--admin-text-mute)" }}
              >
                Search customers
              </span>
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Name or email"
                className="h-9 w-full rounded-md px-3 text-sm focus:outline-none focus:ring-2"
                style={{
                  background: "var(--admin-surface)",
                  border: "1px solid var(--admin-border-strong)",
                  color: "var(--admin-text)",
                }}
              />
            </label>
            <div className="flex gap-2">
              <Button type="submit">Search</Button>
              <ButtonLink href="/admin/customers" variant="secondary">
                Reset
              </ButtonLink>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="All customers"
          description={`${customers.length} profiles loaded.`}
        />
        {customers.length > 0 ? (
          <CustomersTable rows={customers} />
        ) : (
          <CardBody>
            <p
              className="text-sm"
              style={{ color: "var(--admin-text-soft)" }}
            >
              No customers matched the current query.
            </p>
          </CardBody>
        )}
      </Card>
    </section>
  );
}
