import Link from "next/link";

import { toggleDiscountStatusAction } from "./actions";

import { discountRepository } from "@/lib/repositories/discount-repository";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

function formatDiscountValue(discount: {
  type: string;
  value: number;
  minimumOrderAmount: number | null;
}) {
  if (discount.type === "percentage") {
    return `${discount.value}%`;
  }

  if (discount.type === "fixed_amount") {
    return formatCurrency(discount.value);
  }

  if (discount.minimumOrderAmount !== null) {
    return `Free shipping over ${formatCurrency(discount.minimumOrderAmount)}`;
  }

  return "Free shipping";
}

function readApplyMode(appliesTo: unknown) {
  if (!appliesTo || typeof appliesTo !== "object") {
    return { mode: "code" as const, priority: null as number | null };
  }

  const record = appliesTo as Record<string, unknown>;
  return {
    mode:
      record.mode === "automatic" ? ("automatic" as const) : ("code" as const),
    priority:
      typeof record.priority === "number" && Number.isFinite(record.priority)
        ? record.priority
        : null,
  };
}

function formatValidityWindow(discount: {
  startsAt: Date | null;
  endsAt: Date | null;
}) {
  if (!discount.startsAt && !discount.endsAt) {
    return "Always active";
  }

  if (discount.startsAt && !discount.endsAt) {
    return `From ${formatDate(discount.startsAt)}`;
  }

  if (!discount.startsAt && discount.endsAt) {
    return `Until ${formatDate(discount.endsAt)}`;
  }

  return `${formatDate(discount.startsAt as Date)} to ${formatDate(discount.endsAt as Date)}`;
}

export default async function AdminDiscountsPage() {
  const [stats, discounts] = await Promise.all([
    discountRepository.getAdminStats(),
    discountRepository.listForAdmin(150),
  ]);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-zinc-900">Discounts</h2>
        <Link
          href="/admin/discounts/new"
          className="inline-flex h-10 items-center rounded bg-zinc-900 px-4 text-xs font-medium uppercase tracking-[0.06em] text-white hover:bg-zinc-700"
        >
          New discount
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Total codes
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {stats.total}
          </p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Active
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {stats.active}
          </p>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
            Usage limit reached
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {stats.exhausted}
          </p>
        </div>
      </div>

      {discounts.length > 0 ? (
        <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <caption className="sr-only">
              Discount codes with values, application rules, usage, and active
              status controls.
            </caption>
            <thead className="bg-zinc-50">
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
                <th scope="col" className="px-4 py-3">
                  Code
                </th>
                <th scope="col" className="px-4 py-3">
                  Type and value
                </th>
                <th scope="col" className="px-4 py-3">
                  Apply mode
                </th>
                <th scope="col" className="px-4 py-3">
                  Rules
                </th>
                <th scope="col" className="px-4 py-3">
                  Usage
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {discounts.map((discount) => {
                const appliesTo = readApplyMode(discount.appliesTo);

                return (
                  <tr key={discount.id}>
                    <th scope="row" className="px-4 py-3 text-left align-top">
                      <p className="font-medium text-zinc-900">
                        {discount.code}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Created {formatDate(discount.createdAt)}
                      </p>
                    </th>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-zinc-900">
                        {formatDiscountValue(discount)}
                      </p>
                      <p className="text-xs uppercase tracking-[0.06em] text-zinc-500">
                        {discount.type.replaceAll("_", " ")}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex rounded px-2 py-1 text-xs uppercase tracking-[0.06em] ${appliesTo.mode === "automatic" ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-600"}`}
                      >
                        {appliesTo.mode}
                      </span>
                      {appliesTo.priority !== null ? (
                        <p className="mt-1 text-xs text-zinc-500">
                          Priority {appliesTo.priority}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top text-zinc-600">
                      <p>{formatValidityWindow(discount)}</p>
                      {discount.minimumOrderAmount !== null ? (
                        <p className="text-xs text-zinc-500">
                          Min order{" "}
                          {formatCurrency(discount.minimumOrderAmount)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top text-zinc-600">
                      <p>{discount.usageCount} used</p>
                      <p className="text-xs text-zinc-500">
                        {discount.usageLimit !== null
                          ? `${discount.usageLimit} limit`
                          : "No limit"}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="space-y-2">
                        <span
                          className={`inline-flex rounded px-2 py-1 text-xs uppercase tracking-[0.06em] ${discount.isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}
                        >
                          {discount.isActive ? "active" : "inactive"}
                        </span>

                        <form action={toggleDiscountStatusAction}>
                          <input type="hidden" name="id" value={discount.id} />
                          <input
                            type="hidden"
                            name="nextState"
                            value={discount.isActive ? "inactive" : "active"}
                          />
                          <button
                            type="submit"
                            className="inline-flex h-8 items-center rounded border border-zinc-300 px-3 text-xs font-medium uppercase tracking-[0.06em] text-zinc-700 hover:bg-zinc-100"
                          >
                            {discount.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          No discount codes yet. Create one to enable promotions.
        </div>
      )}
    </section>
  );
}
