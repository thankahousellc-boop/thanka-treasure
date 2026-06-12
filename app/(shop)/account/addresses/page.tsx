import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { customerRepository } from "@/lib/repositories/customer-repository";

function formatAddressLine(input: {
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  province: string | null;
  postalCode: string | null;
  countryCode: string;
}) {
  const locality = [input.city, input.province, input.postalCode]
    .filter(Boolean)
    .join(", ");

  return [input.addressLine1, input.addressLine2, locality, input.countryCode]
    .filter(Boolean)
    .join(" • ");
}

export default async function AccountAddressesPage() {
  const session = await auth.getSession();

  if (!session.user) {
    redirect("/auth/login?next=%2Faccount%2Faddresses");
  }

  const rows = await customerRepository
    .listAddressesByProfileId(session.user.id, 50)
    .catch(() => []);

  return (
    <section className="container-page py-14 md:py-20">
      <h1 className="font-serif text-4xl text-ink md:text-5xl">
        Address Book
      </h1>
      <p className="mt-4 max-w-2xl text-base text-ink-soft">
        Your saved shipping and billing addresses.
      </p>

      {rows.length > 0 ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {rows.map((address) => (
            <article
              key={address.id}
              className="border border-paper-3 bg-paper p-5 text-sm text-ink-soft"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.08em] text-ink-mute">
                  {address.type}
                </p>
                {address.isDefault ? (
                  <span className="text-xs uppercase tracking-[0.08em] text-ink-soft">
                    Default
                  </span>
                ) : null}
              </div>

              <p className="mt-2 font-medium text-ink">
                {[address.firstName, address.lastName]
                  .filter(Boolean)
                  .join(" ") || "Saved Address"}
              </p>

              <p className="mt-2 leading-6">
                {formatAddressLine({
                  addressLine1: address.addressLine1,
                  addressLine2: address.addressLine2,
                  city: address.city,
                  province: address.province,
                  postalCode: address.postalCode,
                  countryCode: address.countryCode,
                })}
              </p>

              {address.phone ? (
                <p className="mt-1 text-xs text-ink-mute">
                  {address.phone}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8 border border-paper-3 bg-paper p-6 text-sm text-ink-mute">
          <p>No saved addresses yet.</p>
          <p className="mt-2">
            Addresses added during checkout will appear here.
          </p>
          <Link
            href="/products"
            className="mt-3 inline-flex text-sm font-medium text-ink-soft hover:text-ink"
          >
            Continue shopping
          </Link>
        </div>
      )}
    </section>
  );
}
