import { ButtonLink } from "@/components/admin/ui";

import { createAttributeAction } from "../actions";
import { AttributeForm } from "../attribute-form";

export default function AdminNewAttributePage() {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-(--admin-text)">
          New attribute
        </h2>
        <ButtonLink
          href="/admin/products/attributes"
          variant="secondary"
          size="sm"
        >
          Back to attributes
        </ButtonLink>
      </div>

      <AttributeForm
        action={createAttributeAction}
        submitLabel="Create attribute"
        values={{
          name: "",
          key: "",
          type: "text",
          options: "",
          unit: "",
          isFilterable: false,
          showOnStorefront: true,
          isRequired: false,
        }}
      />
    </section>
  );
}
