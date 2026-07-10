import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  RichTextEditor,
  Select,
  ShowWhenDirty,
  SubmitButton,
  Textarea,
} from "@/components/admin/ui";

import type { AttributeDefinition } from "@/lib/repositories/attribute-repository";

import { quickSetProductStatusAction } from "./actions";
import { ProductAttributesBuilder } from "./product-attributes-builder";
import {
  ProductFramesPicker,
  type AvailableFrame,
} from "./product-frames-picker";
import { ProductStatusButton } from "./product-status-button";
import {
  ProductVariantBuilder,
  type ProductVariantFormValue,
} from "./product-variant-builder";

type ProductFormValues = {
  title: string;
  slug: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  status: "draft" | "active" | "archived";
  productType: string;
  categoryId: string;
  vendor: string;
  tags: string;
  variants: ProductVariantFormValue[];
};

type CategoryOption = {
  id: string;
  name: string;
};

type ProductStatus = "draft" | "active" | "archived";

type ProductFormProps = {
  title: string;
  description: string;
  submitLabel: string;
  values: ProductFormValues;
  action: (formData: FormData) => Promise<void>;
  categories?: CategoryOption[];
  availableFrames?: AvailableFrame[];
  selectedFrameIds?: string[];
  defaultFrameId?: string | null;
  formId?: string;
  hideFramesPicker?: boolean;
  hideSearchEngineCard?: boolean;
  productId?: string;
  attributeDefinitions?: AttributeDefinition[];
  attributeValues?: Record<string, string[]>;
};

function statusTone(status: ProductStatus): "success" | "warning" | "muted" {
  if (status === "active") return "success";
  if (status === "archived") return "muted";
  return "warning";
}

export function ProductForm({
  title,
  description,
  submitLabel,
  values,
  action,
  categories = [],
  availableFrames = [],
  selectedFrameIds = [],
  defaultFrameId = null,
  formId,
  hideFramesPicker = false,
  hideSearchEngineCard = false,
  productId,
  attributeDefinitions = [],
  attributeValues = {},
}: ProductFormProps) {
  const currentStatus = values.status;

  return (
    <form id={formId} action={action} className="space-y-5">
      <input type="hidden" name="slug" value={values.slug} />
      <input type="hidden" name="status" value={currentStatus} />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className="admin-display text-2xl font-semibold"
              style={{ color: "var(--admin-text)" }}
            >
              {title}
            </h2>
            <Badge tone={statusTone(currentStatus)}>{currentStatus}</Badge>
          </div>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--admin-text-soft)" }}
          >
            {description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {productId && currentStatus !== "draft" ? (
            <ProductStatusButton
              formAction={quickSetProductStatusAction.bind(
                null,
                productId,
                "draft",
              )}
            >
              Move to draft
            </ProductStatusButton>
          ) : null}
          {productId && currentStatus !== "active" ? (
            <ProductStatusButton
              formAction={quickSetProductStatusAction.bind(
                null,
                productId,
                "active",
              )}
            >
              Publish
            </ProductStatusButton>
          ) : null}
          <ShowWhenDirty>
            <SubmitButton variant="primary" size="md" pendingLabel="Saving…">
              {submitLabel}
            </SubmitButton>
          </ShowWhenDirty>
        </div>
      </header>

      <div className="space-y-5">
        <Card>
          <CardHeader
            title="Basics"
            description="The product name and the long-form story shown on the storefront."
          />
          <CardBody className="space-y-5">
            <Field
              label="Title"
              hint="Shown to customers and used to build the URL slug."
            >
              <Input
                name="title"
                required
                defaultValue={values.title}
                placeholder="Enlightenment thanka — hand-painted"
              />
            </Field>

            <Field
              label="Description"
              hint="Format with the toolbar — headings, lists, quotes, code, and images are supported."
            >
              <RichTextEditor
                name="description"
                initialValue={values.description}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Variants & inventory"
            description="At least one variant is required. Each variant has its own SKU, price, and stock."
          />
          <CardBody>
            <ProductVariantBuilder initialVariants={values.variants} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Organization"
            description="Used in filters and on the storefront facets."
          />
          <CardBody className="grid gap-4 md:grid-cols-3">
            <Field
              label="Category"
              hint={
                categories.length === 0
                  ? "No categories yet — create one under Categories."
                  : "Drives the storefront category page and filters."
              }
            >
              <Select
                name="categoryId"
                defaultValue={values.categoryId}
                disabled={categories.length === 0}
              >
                <option value="">— None —</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Product type"
              hint="Free-text descriptor (e.g. thanka). Not the category."
            >
              <Input
                name="productType"
                defaultValue={values.productType}
                placeholder="thanka"
              />
            </Field>
            <Field label="Vendor">
              <Input
                name="vendor"
                defaultValue={values.vendor}
                placeholder="Thanka Treasure"
              />
            </Field>
            <Field label="Tags" hint="Comma-separated. Up to 20.">
              <Input
                name="tags"
                defaultValue={values.tags}
                placeholder="thanka, hand-painted, buddhist"
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Specifications"
            description="Product qualities defined under Attributes — shown on the storefront and used for filters and barcodes."
          />
          <CardBody>
            <ProductAttributesBuilder
              definitions={attributeDefinitions}
              selected={attributeValues}
            />
          </CardBody>
        </Card>

        {hideSearchEngineCard ? null : (
          <Card>
            <CardHeader
              title="Search engine listing"
              description="Override how this product appears in Google and social previews."
            />
            <CardBody className="grid gap-4 md:grid-cols-2">
              <Field label="Meta title" hint="Recommended 60–70 characters.">
                <Input name="metaTitle" defaultValue={values.metaTitle} />
              </Field>
              <Field
                label="Meta description"
                hint="Recommended 150–160 characters."
              >
                <Textarea
                  name="metaDescription"
                  rows={3}
                  defaultValue={values.metaDescription}
                />
              </Field>
            </CardBody>
          </Card>
        )}

        {hideFramesPicker ? null : (
          <ProductFramesPicker
            availableFrames={availableFrames}
            initialSelectedIds={selectedFrameIds}
            initialDefaultId={defaultFrameId}
          />
        )}
      </div>

      <ShowWhenDirty>
        <div
          className="sticky bottom-3 flex items-center justify-end gap-2 rounded-md px-4 py-3"
          style={{
            background: "var(--admin-surface)",
            border: "1px solid var(--admin-border)",
            boxShadow: "var(--admin-shadow-lg)",
          }}
        >
          <span
            className="mr-auto text-xs"
            style={{ color: "var(--admin-text-mute)" }}
          >
            Unsaved changes — the URL slug is generated automatically from the
            title.
          </span>
          <SubmitButton variant="primary" size="md" pendingLabel="Saving…">
            {submitLabel}
          </SubmitButton>
        </div>
      </ShowWhenDirty>
    </form>
  );
}
