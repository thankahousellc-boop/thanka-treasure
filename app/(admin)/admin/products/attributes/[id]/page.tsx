import { notFound } from "next/navigation";

import { ButtonLink } from "@/components/admin/ui";
import { attributeRepository } from "@/lib/repositories/attribute-repository";

import { updateAttributeAction } from "../actions";
import { AttributeForm } from "../attribute-form";

type AdminEditAttributePageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditAttributePage({
  params,
}: AdminEditAttributePageProps) {
  const { id } = await params;
  const definition = await attributeRepository.getDefinition(id);

  if (!definition) {
    notFound();
  }

  const options = Array.isArray(definition.options)
    ? (definition.options as string[])
    : [];

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-(--admin-text)">
          Edit attribute
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
        action={updateAttributeAction.bind(null, definition.id)}
        submitLabel="Save attribute"
        values={{
          name: definition.name,
          key: definition.key,
          type: definition.type,
          options: options.join("\n"),
          unit: definition.unit ?? "",
          isFilterable: definition.isFilterable,
          showOnStorefront: definition.showOnStorefront,
          isRequired: definition.isRequired,
        }}
      />
    </section>
  );
}
