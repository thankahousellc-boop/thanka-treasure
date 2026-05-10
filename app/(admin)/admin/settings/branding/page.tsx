import { PageHeader } from "@/components/admin/ui";
import { getBranding } from "@/lib/branding";

import { updateBrandingAction } from "./actions";
import { BrandingForm } from "./branding-form";

export const dynamic = "force-dynamic";

export default async function BrandingSettingsPage() {
  const branding = await getBranding();

  return (
    <>
      <PageHeader
        title="Branding"
        description="Logo, colors, and fonts that the storefront uses. Changes apply immediately after save."
      />
      <BrandingForm
        action={updateBrandingAction}
        values={{
          brandName: branding.brandName,
          brandTagline: branding.brandTagline,
          bodyFont: branding.bodyFont,
          displayFont: branding.displayFont,
          colors: branding.colors,
          logoLightUrl: branding.logoLightUrl,
          logoDarkUrl: branding.logoDarkUrl,
        }}
      />
    </>
  );
}
