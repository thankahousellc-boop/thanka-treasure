import { PageHeader } from "@/components/admin/ui";
import { getStoreContact, getStorefront } from "@/lib/site-settings";

import {
  updateStoreContactAction,
  updateStorefrontAction,
} from "./actions";
import { ContactForm } from "./contact-form";
import { HealthCard } from "./health-card";
import { StorefrontForm } from "./storefront-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [contact, storefront] = await Promise.all([
    getStoreContact(),
    getStorefront(),
  ]);

  return (
    <>
      <PageHeader
        title="Site settings"
        description="Contact details, storefront copy, and integration health. Branding lives in the Branding section."
      />
      <div className="space-y-5">
        <HealthCard />
        <ContactForm values={contact} action={updateStoreContactAction} />
        <StorefrontForm values={storefront} action={updateStorefrontAction} />
      </div>
    </>
  );
}
