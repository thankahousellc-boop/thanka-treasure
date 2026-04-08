import Link from "next/link";

import { customerRepository } from "@/lib/repositories/customer-repository";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

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
      limit: 150,
    }),
  ]);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-zinc-900">Customers</h2>
        <p className="text-sm text-zinc-500">Showing {customers.length} profiles</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Total customers</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{stats.total}</p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Repeat customers</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{stats.repeatCustomers}</p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Marketing opt-ins</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{stats.marketingOptIns}</p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">High-value (>$500)</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{stats.highValueCustomers}</p>
        </div>
      </div>

      <form className="flex flex-col gap-2 rounded border border-zinc-200 bg-white p-4 sm:flex-row sm:items-end">
        <label className="flex-1 space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Search customers
          </span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Name or email"
            className="h-10 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded bg-zinc-900 px-4 text-xs font-medium uppercase tracking-[0.06em] text-white hover:bg-zinc-700"
          >
            Search
          </button>
          <Link
            href="/admin/customers"
            className="inline-flex h-10 items-center rounded border border-zinc-300 px-4 text-xs font-medium uppercase tracking-[0.06em] text-zinc-700 hover:bg-zinc-100"
          >
            Reset
          </Link>
        </div>
      </form>

      {customers.length > 0 ? (
        <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <caption className="sr-only">
              Customer profiles with order counts, lifetime spend, marketing
              status, and join dates.
            </caption>
            <thead className="bg-zinc-50">
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
                <th scope="col" className="px-4 py-3">
                  Customer
                </th>
                <th scope="col" className="px-4 py-3">
                  Orders
                </th>
                <th scope="col" className="px-4 py-3">
                  Lifetime spend
                </th>
                <th scope="col" className="px-4 py-3">
                  Marketing
                </th>
                <th scope="col" className="px-4 py-3">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <th scope="row" className="px-4 py-3 text-left align-top">
                    <p className="font-medium text-zinc-900">
                      {customer.firstName || customer.lastName
                        ? `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim()
                        : "Unnamed customer"}
                    </p>
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-xs text-zinc-500 hover:text-zinc-700"
                    >
                      {customer.email}
                    </a>
                    {customer.phone ? (
                      <p className="text-xs text-zinc-500">{customer.phone}</p>
                    ) : null}
                  </th>
                  <td className="px-4 py-3 align-top font-medium text-zinc-900">
                    {customer.totalOrders}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {formatCurrency(customer.totalSpent)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {customer.acceptsMarketing ? (
                      <span className="rounded bg-emerald-100 px-2 py-1 text-xs uppercase tracking-[0.06em] text-emerald-700">
                        Subscribed
                      </span>
                    ) : (
                      <span className="rounded bg-zinc-100 px-2 py-1 text-xs uppercase tracking-[0.06em] text-zinc-600">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-600">
                    {formatDate(customer.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          No customers matched the current query.
        </div>
      )}
    </section>
  );
}
