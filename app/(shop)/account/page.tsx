import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { customerRepository } from "@/lib/repositories/customer-repository";
import { orderRepository } from "@/lib/repositories/order-repository";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

async function signOutAction() {
  "use server";

  try {
    await auth.signOut();
  } catch {
    // Ignore sign-out provider errors and continue redirect.
  }

  redirect("/auth/login?message=Signed%20out%20successfully.");
}

export default async function AccountPage() {
  const session = await auth.getSession();

  if (!session.user) {
    redirect("/auth/login?next=%2Faccount");
  }

  const [customer, recentOrders] = await Promise.all([
    customerRepository.findByProfileId(session.user.id),
    orderRepository.listForCustomer(session, 5).catch(() => []),
  ]);

  const displayName =
    [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
    session.user.email;

  return (
    <section className="container-page py-14 md:py-20">
      <p className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
        Account Dashboard
      </p>
      <h1 className="mt-2 font-serif text-4xl text-maroon-900 md:text-5xl">
        Welcome, {displayName}
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-warm-gray-700">
        Manage your profile information, saved addresses, and order history.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <div className="border border-border-light bg-white p-5">
          <p className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
            Email
          </p>
          <p className="mt-2 text-sm text-warm-gray-800">
            {session.user.email}
          </p>
        </div>
        <div className="border border-border-light bg-white p-5">
          <p className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
            Lifetime Orders
          </p>
          <p className="mt-2 text-sm text-warm-gray-800">
            {customer?.totalOrders ?? 0}
          </p>
        </div>
        <div className="border border-border-light bg-white p-5">
          <p className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
            Lifetime Spend
          </p>
          <p className="mt-2 text-sm text-warm-gray-800">
            {formatCurrency(customer?.totalSpent ?? 0)}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/account/orders"
          className="inline-flex h-10 items-center border border-border-light px-4 text-xs font-medium uppercase tracking-[0.06em] text-warm-gray-700 hover:bg-bg-secondary"
        >
          View Orders
        </Link>
        <Link
          href="/account/addresses"
          className="inline-flex h-10 items-center border border-border-light px-4 text-xs font-medium uppercase tracking-[0.06em] text-warm-gray-700 hover:bg-bg-secondary"
        >
          Manage Addresses
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="inline-flex h-10 items-center border border-maroon-700 px-4 text-xs font-medium uppercase tracking-[0.06em] text-maroon-700 hover:bg-maroon-50"
          >
            Sign Out
          </button>
        </form>
      </div>

      <div className="mt-10 border border-border-light bg-white p-5">
        <h2 className="font-serif text-2xl text-maroon-900">Recent Orders</h2>

        {recentOrders.length > 0 ? (
          <ul className="mt-4 divide-y divide-border-light">
            {recentOrders.map((order) => (
              <li key={order.id} className="py-3 text-sm text-warm-gray-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-warm-gray-900">
                    {order.orderNumber}
                  </p>
                  <p>{formatCurrency(order.grandTotal, order.currency)}</p>
                </div>
                <p className="mt-1 text-xs uppercase tracking-[0.08em] text-warm-gray-500">
                  {order.status} • {order.paymentStatus} •{" "}
                  {order.fulfillmentStatus}
                </p>
                <p className="mt-1 text-xs text-warm-gray-500">
                  {formatDate(order.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-warm-gray-600">
            No orders yet. Browse products to place your first order.
          </p>
        )}
      </div>
    </section>
  );
}
