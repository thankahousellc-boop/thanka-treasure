import Link from "next/link";

import { Field, Input, Select } from "@/components/admin/ui";
import type { AttributeDefinition } from "@/lib/repositories/attribute-repository";

export type ProductAttributesBuilderProps = {
  definitions: AttributeDefinition[];
  // definitionId → currently-selected value(s) for this product.
  selected: Record<string, string[]>;
};

// Renders one form control per attribute definition. Each control submits under
// `attr_<definitionId>` so the product action can collect values without knowing
// the attribute set ahead of time. multi_select emits one entry per checked box.
export function ProductAttributesBuilder({
  definitions,
  selected,
}: ProductAttributesBuilderProps) {
  if (definitions.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--admin-text-soft)" }}>
        No attributes defined yet. Create them under{" "}
        <Link
          href="/admin/products/attributes"
          className="underline"
          style={{ color: "var(--admin-text)" }}
        >
          Attributes
        </Link>{" "}
        to capture qualities like Artist, Size, Gold, or Brocade.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {definitions.map((definition) => {
        const name = `attr_${definition.id}`;
        const values = selected[definition.id] ?? [];
        const label = definition.isRequired
          ? `${definition.name} *`
          : definition.name;
        const options = Array.isArray(definition.options)
          ? (definition.options as string[])
          : [];

        if (definition.type === "multi_select") {
          return (
            <Field
              key={definition.id}
              label={label}
              className="md:col-span-2"
            >
              <div className="flex flex-wrap gap-3 pt-1">
                {options.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: "var(--admin-text-soft)" }}
                  >
                    <input
                      type="checkbox"
                      name={name}
                      value={option}
                      defaultChecked={values.includes(option)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </Field>
          );
        }

        if (definition.type === "select" || definition.type === "boolean") {
          const selectOptions =
            definition.type === "boolean" ? ["Yes", "No"] : options;
          return (
            <Field key={definition.id} label={label}>
              <Select name={name} defaultValue={values[0] ?? ""}>
                <option value="">—</option>
                {selectOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
          );
        }

        return (
          <Field
            key={definition.id}
            label={label}
            hint={definition.unit ? `In ${definition.unit}.` : undefined}
          >
            <Input
              name={name}
              type={definition.type === "number" ? "number" : "text"}
              step={definition.type === "number" ? "any" : undefined}
              defaultValue={values[0] ?? ""}
            />
          </Field>
        );
      })}
    </div>
  );
}
