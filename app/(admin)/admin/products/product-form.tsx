import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  RichTextEditor,
  Textarea,
} from "@/components/admin/ui";

import { quickSetProductStatusAction } from "./actions";
import {
  ProductFramesPicker,
  type AvailableFrame,
} from "./product-frames-picker";
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
  vendor: string;
  tags: string;
  variants: ProductVariantFormValue[];
};

type ProductStatus = "draft" | "active" | "archived";

type ProductFormProps = {
  title: string;
  description: string;
  submitLabel: string;
  values: ProductFormValues;
  action: (formData: FormData) => Promise<void>;
  availableFrames?: AvailableFrame[];
  selectedFrameIds?: string[];
  defaultFrameId?: string | null;
  formId?: string;
  hideFramesPicker?: boolean;
  hideSearchEngineCard?: boolean;
  productId?: string;
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
  availableFrames = [],
  selectedFrameIds = [],
  defaultFrameId = null,
  formId,
  hideFramesPicker = false,
  hideSearchEngineCard = false,
  productId,
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
            <button
              type="submit"
              formAction={quickSetProductStatusAction.bind(
                null,
                productId,
                "draft",
              )}
              formNoValidate
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition hover:brightness-110"
              style={{
                backgroundColor: "var(--admin-surface)",
                color: "var(--admin-text)",
                border: "1px solid var(--admin-border-strong)",
              }}
            >
              Move to draft
            </button>
          ) : null}
          {productId && currentStatus !== "active" ? (
            <button
              type="submit"
              formAction={quickSetProductStatusAction.bind(
                null,
                productId,
                "active",
              )}
              formNoValidate
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition hover:brightness-110"
              style={{
                backgroundColor: "var(--admin-surface)",
                color: "var(--admin-text)",
                border: "1px solid var(--admin-border-strong)",
              }}
            >
              Publish
            </button>
          ) : null}
          <Button type="submit" variant="primary" size="md">
            {submitLabel}
          </Button>
        </div>
      </header>

      <div className="space-y-5">
        <Card>
          <CardHeader
            title="Basics"
            description="The product name and the long-form story shown on the storefront."
          />
          <CardBody className="space-y-5">
            <Field label="Title" hint="Shown to customers and used to build the URL slug.">
              <Input
                name="title"
                required
                defaultValue={values.title}
                placeholder="Enlightenment Thangka — hand-painted"
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
            <Field label="Product type">
              <Input
                name="productType"
                defaultValue={values.productType}
                placeholder="Thangka"
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
                placeholder="thangka, hand-painted, buddhist"
              />
            </Field>
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
              <Field label="Meta description" hint="Recommended 150–160 characters.">
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

      <div
        className="sticky bottom-3 flex items-center justify-end gap-2 rounded-md px-4 py-3"
        style={{
          background: "var(--admin-surface)",
          border: "1px solid var(--admin-border)",
          boxShadow: "var(--admin-shadow-lg)",
        }}
      >
        <span className="mr-auto text-xs" style={{ color: "var(--admin-text-mute)" }}>
          The URL slug is generated automatically from the title.
        </span>
        <Button type="submit" variant="primary" size="md">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
