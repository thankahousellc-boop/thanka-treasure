import { FlashToast } from "@/components/admin/flash-toast";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Icon,
} from "@/components/admin/ui";
import { attributeRepository } from "@/lib/repositories/attribute-repository";

import { AttributeRowActions } from "./attribute-row-actions";

const TYPE_LABELS: Record<string, string> = {
  text: "Text",
  number: "Number",
  boolean: "Yes / No",
  select: "Select",
  multi_select: "Multi-select",
};

export default async function AdminAttributesPage() {
  const definitions = await attributeRepository.listDefinitions();

  return (
    <section className="space-y-5">
      <FlashToast
        messages={{
          created: "Attribute created.",
          saved: "Attribute saved.",
          deleted: "Attribute deleted.",
        }}
      />
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className="admin-display text-2xl font-semibold"
            style={{ color: "var(--admin-text)" }}
          >
            Attributes
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--admin-text-soft)" }}>
            Define the qualities products can have — e.g. Artist, Size, Gold,
            Brocade, Year. Each one becomes a field on the product form.
          </p>
        </div>
        <ButtonLink href="/admin/products/attributes/new">
          <Icon.Plus width={14} height={14} />
          <span>New attribute</span>
        </ButtonLink>
      </header>

      <Card>
        <CardHeader
          title="All attributes"
          description="Storefront facets and barcode config are built from this list."
        />
        {definitions.length > 0 ? (
          <CardBody className="space-y-1.5">
            {definitions.map((definition) => (
              <div
                key={definition.id}
                className="group flex flex-wrap items-center justify-between gap-3 rounded-lg border border-(--admin-border) bg-(--admin-surface) px-3.5 py-2.5 transition hover:border-(--admin-border-strong) hover:bg-(--admin-surface-2)"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "var(--admin-text)" }}
                    >
                      {definition.name}
                    </span>
                    <code
                      className="rounded px-1.5 py-0.5 font-mono text-[11px]"
                      style={{
                        background: "var(--admin-surface-2)",
                        color: "var(--admin-text-mute)",
                        border: "1px solid var(--admin-border)",
                      }}
                    >
                      {definition.key}
                    </code>
                    <Badge tone="info">
                      {TYPE_LABELS[definition.type] ?? definition.type}
                    </Badge>
                    {definition.isFilterable ? (
                      <Badge tone="success">Filter</Badge>
                    ) : null}
                    {definition.showOnStorefront ? (
                      <Badge tone="muted">Storefront</Badge>
                    ) : null}
                    {definition.isRequired ? (
                      <Badge tone="warning">Required</Badge>
                    ) : null}
                  </div>
                  {Array.isArray(definition.options) &&
                  definition.options.length > 0 ? (
                    <p
                      className="mt-1.5 text-xs"
                      style={{ color: "var(--admin-text-mute)" }}
                    >
                      {(definition.options as string[]).join(" · ")}
                    </p>
                  ) : null}
                </div>
                <div className="opacity-70 transition group-hover:opacity-100">
                  <AttributeRowActions
                    id={definition.id}
                    name={definition.name}
                  />
                </div>
              </div>
            ))}
          </CardBody>
        ) : (
          <CardBody>
            <EmptyState
              icon={<Icon.Layers width={26} height={26} />}
              title="No attributes yet"
              description="Create one to start capturing product qualities like Artist, Size, or Year."
              action={
                <ButtonLink href="/admin/products/attributes/new" size="sm">
                  <Icon.Plus width={14} height={14} />
                  <span>New attribute</span>
                </ButtonLink>
              }
            />
          </CardBody>
        )}
      </Card>
    </section>
  );
}
