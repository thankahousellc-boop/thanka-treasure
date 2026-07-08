"use client";

import { useState } from "react";

import {
  Field,
  Input,
  Select,
  SubmitButton,
  Textarea,
} from "@/components/admin/ui";

export type AttributeFormValues = {
  name: string;
  key: string;
  type: string;
  options: string;
  unit: string;
  isFilterable: boolean;
  showOnStorefront: boolean;
  isRequired: boolean;
};

type AttributeFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  values: AttributeFormValues;
  submitLabel: string;
};

const TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Yes / No" },
  { value: "select", label: "Select (one of)" },
  { value: "multi_select", label: "Multi-select (many of)" },
];

export function AttributeForm({
  action,
  values,
  submitLabel,
}: AttributeFormProps) {
  const [type, setType] = useState(values.type);
  const needsOptions = type === "select" || type === "multi_select";

  return (
    <form
      action={action}
      className="grid gap-4 rounded border border-(--admin-border) bg-(--admin-surface) p-5 md:grid-cols-2"
    >
      <Field
        label="Name"
        hint="Shown to customers, e.g. “Artist Name”."
      >
        <Input
          name="name"
          required
          defaultValue={values.name}
          placeholder="Artist Name"
        />
      </Field>

      <Field
        label="Key (optional)"
        hint="Stable slug used in filters + barcode config. Auto-generated from the name when blank."
      >
        <Input name="key" defaultValue={values.key} placeholder="artist-name" />
      </Field>

      <Field label="Type">
        <Select
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Unit (optional)" hint="Display suffix, e.g. “cm”.">
        <Input name="unit" defaultValue={values.unit} placeholder="cm" />
      </Field>

      {needsOptions ? (
        <div className="md:col-span-2">
          <Field
            label="Options"
            hint="One per line (or comma-separated). e.g. Gold / No Gold."
          >
            <Textarea
              name="options"
              rows={4}
              defaultValue={values.options}
              placeholder={"Gold\nNo Gold"}
            />
          </Field>
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-(--admin-text-soft)">
        <input
          type="checkbox"
          name="showOnStorefront"
          defaultChecked={values.showOnStorefront}
        />
        Show in storefront specifications
      </label>

      <label className="flex items-center gap-2 text-sm text-(--admin-text-soft)">
        <input
          type="checkbox"
          name="isFilterable"
          defaultChecked={values.isFilterable}
        />
        Use as a storefront filter (facet)
      </label>

      <label className="flex items-center gap-2 text-sm text-(--admin-text-soft)">
        <input
          type="checkbox"
          name="isRequired"
          defaultChecked={values.isRequired}
        />
        Required when editing a product
      </label>

      <div className="md:col-span-2">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
