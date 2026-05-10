import {
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  Icon,
} from "@/components/admin/ui";

import { DownloadTemplateButton } from "./download-template-button";
import { ImportForm } from "./import-form";

export const dynamic = "force-dynamic";

const COLUMNS: Array<{
  name: string;
  required: boolean;
  notes: string;
}> = [
  { name: "title", required: true, notes: "Product title (≤180 chars)." },
  { name: "slug", required: false, notes: "Auto-generated from title if blank. Rows sharing a slug merge into one product." },
  { name: "description", required: false, notes: "Long description. May contain HTML." },
  { name: "metaTitle", required: false, notes: "SEO title (≤180 chars)." },
  { name: "metaDescription", required: false, notes: "SEO description (≤320 chars)." },
  { name: "status", required: false, notes: "draft (default) | active | archived." },
  { name: "productType", required: false, notes: "Free-form classifier." },
  { name: "vendor", required: false, notes: "Vendor / artist name." },
  { name: "tags", required: false, notes: "Comma-separated tags." },
  { name: "variantTitle", required: false, notes: "Variant name. Defaults to \"Default\"." },
  { name: "sku", required: false, notes: "SKU (must be unique across the store)." },
  { name: "price", required: true, notes: "Decimal in main currency unit (e.g. 49.99)." },
  { name: "compareAtPrice", required: false, notes: "Optional MSRP, ≥ price." },
  { name: "option1", required: false, notes: "Variant option 1 (e.g. Size: 24x36)." },
  { name: "option2", required: false, notes: "Variant option 2." },
  { name: "option3", required: false, notes: "Variant option 3." },
  { name: "inventoryQuantity", required: false, notes: "Whole number, default 0." },
  { name: "lowStockThreshold", required: false, notes: "Whole number, default 5." },
  { name: "images", required: false, notes: "Pipe-separated. Each entry is either a full https:// URL or a filename matching one of the uploaded image files." },
  { name: "imageAltText", required: false, notes: "Pipe-separated alt texts, aligned with images by index." },
];

const SAMPLE_CSV = [
  "title,slug,status,price,inventoryQuantity,images,imageAltText",
  "\"Avalokiteshvara Thangka\",avalokiteshvara,active,499.00,3,\"https://example.com/a.jpg|main.jpg\",\"Front view|Detail\"",
  "\"Green Tara Thangka\",,draft,349.00,5,green-tara.jpg,\"Center panel\"",
].join("\n");

function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const TEMPLATE_ROWS: Array<Record<string, string>> = [
  {
    title: "Avalokiteshvara Thangka",
    slug: "avalokiteshvara",
    description: "<p>Hand-painted on cotton canvas with mineral pigments.</p>",
    metaTitle: "Avalokiteshvara Thangka",
    metaDescription: "Traditional hand-painted Avalokiteshvara thangka.",
    status: "active",
    productType: "Thangka",
    vendor: "Thanka Treasure",
    tags: "buddhist,thangka,handmade",
    variantTitle: "24x36",
    sku: "AVK-24x36",
    price: "499.00",
    compareAtPrice: "599.00",
    option1: "Size: 24x36",
    option2: "",
    option3: "",
    inventoryQuantity: "3",
    lowStockThreshold: "1",
    images: "https://example.com/a.jpg|main.jpg",
    imageAltText: "Front view|Detail",
  },
  {
    title: "Avalokiteshvara Thangka",
    slug: "avalokiteshvara",
    description: "",
    metaTitle: "",
    metaDescription: "",
    status: "active",
    productType: "Thangka",
    vendor: "Thanka Treasure",
    tags: "",
    variantTitle: "36x48",
    sku: "AVK-36x48",
    price: "699.00",
    compareAtPrice: "",
    option1: "Size: 36x48",
    option2: "",
    option3: "",
    inventoryQuantity: "1",
    lowStockThreshold: "1",
    images: "",
    imageAltText: "",
  },
  {
    title: "Green Tara Thangka",
    slug: "",
    description: "",
    metaTitle: "",
    metaDescription: "",
    status: "draft",
    productType: "Thangka",
    vendor: "",
    tags: "",
    variantTitle: "",
    sku: "",
    price: "349.00",
    compareAtPrice: "",
    option1: "",
    option2: "",
    option3: "",
    inventoryQuantity: "5",
    lowStockThreshold: "",
    images: "green-tara.jpg",
    imageAltText: "Center panel",
  },
];

const TEMPLATE_CSV = [
  COLUMNS.map((c) => c.name).join(","),
  ...TEMPLATE_ROWS.map((row) =>
    COLUMNS.map((c) => csvField(row[c.name] ?? "")).join(","),
  ),
].join("\n");

export default function ProductImportPage() {
  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className="admin-display text-2xl font-semibold"
            style={{ color: "var(--admin-text)" }}
          >
            Bulk import products
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--admin-text-soft)" }}
          >
            Upload a CSV to create many products at once. Optionally include image files referenced from the CSV.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DownloadTemplateButton csv={TEMPLATE_CSV} />
          <ButtonLink href="/admin/products" variant="secondary" size="md">
            <Icon.ChevronDown style={{ transform: "rotate(90deg)" }} />
            <span>Back to products</span>
          </ButtonLink>
        </div>
      </header>

      <ImportForm />

      <Card>
        <CardHeader
          title="CSV format"
          description="Header row is required. Column order does not matter; unknown columns are ignored."
        />
        <CardBody className="space-y-4">
          <div className="overflow-x-auto">
            <table
              className="min-w-full text-sm"
              style={{ color: "var(--admin-text)" }}
            >
              <thead>
                <tr
                  className="text-left text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{
                    color: "var(--admin-text-mute)",
                    borderBottom: "1px solid var(--admin-border)",
                    background: "var(--admin-surface-2)",
                  }}
                >
                  <th className="px-3 py-2">Column</th>
                  <th className="px-3 py-2">Required</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {COLUMNS.map((column) => (
                  <tr
                    key={column.name}
                    style={{ borderTop: "1px solid var(--admin-border)" }}
                  >
                    <td className="px-3 py-2 align-top font-mono text-xs">
                      {column.name}
                    </td>
                    <td
                      className="px-3 py-2 align-top text-xs"
                      style={{
                        color: column.required
                          ? "#b3261e"
                          : "var(--admin-text-mute)",
                      }}
                    >
                      {column.required ? "yes" : "no"}
                    </td>
                    <td
                      className="px-3 py-2 align-top text-xs"
                      style={{ color: "var(--admin-text-soft)" }}
                    >
                      {column.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--admin-text-mute)" }}
              >
                Sample
              </p>
              <DownloadTemplateButton csv={TEMPLATE_CSV} />
            </div>
            <pre
              className="overflow-x-auto rounded-md p-3 text-[11px] leading-relaxed"
              style={{
                background: "var(--admin-surface-2)",
                border: "1px solid var(--admin-border)",
                color: "var(--admin-text)",
              }}
            >
              {SAMPLE_CSV}
            </pre>
          </div>

          <ul
            className="list-disc space-y-1 pl-5 text-xs"
            style={{ color: "var(--admin-text-soft)" }}
          >
            <li>Rows whose slug already exists in the catalogue are skipped.</li>
            <li>Image fetch failures do not abort the row — the product is created and the failed image is reported.</li>
            <li>Only JPEG / PNG / WEBP up to 5MB each.</li>
          </ul>
        </CardBody>
      </Card>
    </section>
  );
}
