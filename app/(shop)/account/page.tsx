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
      <p className="text-xs uppercase tracking-[0.08em] text-ink-mute">
        Account Dashboard
      </p>
      <h1 className="mt-2 font-serif text-4xl text-ink md:text-5xl">
        Welcome, {displayName}
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-ink-soft">
        Manage your profile information, saved addresses, and order history.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <div className="border border-paper-3 bg-paper p-5">
          <p className="text-xs uppercase tracking-[0.08em] text-ink-mute">
            Email
          </p>
          <p className="mt-2 text-sm text-ink">
            {session.user.email}
          </p>
        </div>
        <div className="border border-paper-3 bg-paper p-5">
          <p className="text-xs uppercase tracking-[0.08em] text-ink-mute">
            Lifetime Orders
          </p>
          <p className="mt-2 text-sm text-ink">
            {customer?.totalOrders ?? 0}
          </p>
        </div>
        <div className="border border-paper-3 bg-paper p-5">
          <p className="text-xs uppercase tracking-[0.08em] text-ink-mute">
            Lifetime Spend
          </p>
          <p className="mt-2 text-sm text-ink">
            {formatCurrency(customer?.totalSpent ?? 0)}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {session.user.role === "admin" ? (
          <Link
            href="/admin"
            className="inline-flex h-10 items-center border border-ink bg-ink px-4 text-xs font-medium uppercase tracking-[0.06em] text-paper hover:bg-ink-soft"
          >
            View Admin Dashboard
          </Link>
        ) : null}
        <Link
          href="/account/orders"
          className="inline-flex h-10 items-center border border-paper-3 px-4 text-xs font-medium uppercase tracking-[0.06em] text-ink-soft hover:bg-paper-2"
        >
          View Orders
        </Link>
        <Link
          href="/account/addresses"
          className="inline-flex h-10 items-center border border-paper-3 px-4 text-xs font-medium uppercase tracking-[0.06em] text-ink-soft hover:bg-paper-2"
        >
          Manage Addresses
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="inline-flex h-10 items-center border border-ink-soft px-4 text-xs font-medium uppercase tracking-[0.06em] text-ink-soft hover:bg-paper-2"
          >
            Sign Out
          </button>
        </form>
      </div>

      <div className="mt-10 border border-paper-3 bg-paper p-5">
        <h2 className="font-serif text-2xl text-ink">Recent Orders</h2>

        {recentOrders.length > 0 ? (
          <ul className="mt-4 divide-y divide-paper-3">
            {recentOrders.map((order) => (
              <li key={order.id} className="py-3 text-sm text-ink-soft">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-ink">
                    {order.orderNumber}
                  </p>
                  <p>{formatCurrency(order.grandTotal, order.currency)}</p>
                </div>
                <p className="mt-1 text-xs uppercase tracking-[0.08em] text-ink-mute">
                  {order.status} • {order.paymentStatus} •{" "}
                  {order.fulfillmentStatus}
                </p>
                <p className="mt-1 text-xs text-ink-mute">
                  {formatDate(order.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-ink-mute">
            No orders yet. Browse products to place your first order.
          </p>
        )}
      </div>
    </section>
  );
}
