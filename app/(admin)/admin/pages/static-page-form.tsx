"use client";

import { useMemo, useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  RichTextEditor,
  Select,
  Textarea,
} from "@/components/admin/ui";

type StaticPageStatus = "draft" | "published" | "active";

type StaticPageFormValues = {
  title: string;
  slug: string;
  content: string;
  status: StaticPageStatus;
  metaTitle: string;
  metaDescription: string;
};

type StaticPageFormProps = {
  title: string;
  description: string;
  submitLabel: string;
  values: StaticPageFormValues;
  action: (formData: FormData) => Promise<void>;
  showTemplates?: boolean;
};

type TemplateId =
  | "blank"
  | "about"
  | "shipping"
  | "privacy"
  | "terms"
  | "returns"
  | "faq"
  | "contact";

type Template = {
  id: TemplateId;
  label: string;
  description: string;
  values: {
    title: string;
    slug: string;
    content: string;
    metaTitle: string;
    metaDescription: string;
  };
};

const TEMPLATES: Template[] = [
  {
    id: "blank",
    label: "Blank page",
    description: "Start from scratch.",
    values: {
      title: "",
      slug: "",
      content: "",
      metaTitle: "",
      metaDescription: "",
    },
  },
  {
    id: "about",
    label: "About",
    description: "Story of your brand and craft.",
    values: {
      title: "About us",
      slug: "about",
      content:
        "<h2>Our story</h2><p>Tell visitors who you are, where your thangkas come from, and what makes your work distinctive.</p><h2>Our artisans</h2><p>Introduce the painters and the lineage behind the craft.</p>",
      metaTitle: "About us",
      metaDescription:
        "Learn about our story, our artisans, and the tradition behind every thangka.",
    },
  },
  {
    id: "shipping",
    label: "Shipping policy",
    description: "Delivery times, regions, and rates.",
    values: {
      title: "Shipping policy",
      slug: "shipping-policy",
      content:
        "<h2>Processing time</h2><p>Orders are processed within X business days.</p><h2>Shipping rates &amp; delivery</h2><p>List the carriers, regions you ship to, and estimated transit times.</p><h2>International orders</h2><p>Note any duties or import taxes the customer is responsible for.</p>",
      metaTitle: "Shipping policy",
      metaDescription:
        "Processing times, shipping rates, and delivery estimates for every region we serve.",
    },
  },
  {
    id: "privacy",
    label: "Privacy policy",
    description: "What data you collect and how.",
    values: {
      title: "Privacy policy",
      slug: "privacy-policy",
      content:
        "<h2>Information we collect</h2><p>Describe the personal information you collect at checkout, on signup, and through analytics.</p><h2>How we use it</h2><p>Explain how data is used to fulfil orders, communicate, and improve the store.</p><h2>Your rights</h2><p>Note the rights customers have to access, correct, or delete their data.</p>",
      metaTitle: "Privacy policy",
      metaDescription:
        "How we collect, use, and protect your personal information.",
    },
  },
  {
    id: "terms",
    label: "Terms of service",
    description: "Legal terms for using your store.",
    values: {
      title: "Terms of service",
      slug: "terms-of-service",
      content:
        "<h2>Acceptance of terms</h2><p>By using this site, customers agree to these terms.</p><h2>Orders and payment</h2><p>Outline how orders are accepted and the payment terms.</p><h2>Limitation of liability</h2><p>Standard liability and warranty disclaimers go here.</p>",
      metaTitle: "Terms of service",
      metaDescription:
        "The terms governing the use of our store and the sale of our products.",
    },
  },
  {
    id: "returns",
    label: "Returns & refunds",
    description: "Return windows and conditions.",
    values: {
      title: "Returns & refunds",
      slug: "returns",
      content:
        "<h2>Return window</h2><p>Items can be returned within X days of delivery, unworn and in original packaging.</p><h2>How to start a return</h2><p>Email us at orders@example.com with your order number to begin a return.</p><h2>Refunds</h2><p>Refunds are issued to the original payment method within 5–10 business days of receipt.</p>",
      metaTitle: "Returns & refunds",
      metaDescription:
        "Our return window, conditions, and refund timeline.",
    },
  },
  {
    id: "faq",
    label: "FAQ",
    description: "Common customer questions.",
    values: {
      title: "Frequently asked questions",
      slug: "faq",
      content:
        "<h2>Are your thangkas hand-painted?</h2><p>Yes. Each piece is hand-painted by trained artisans.</p><h2>How long does shipping take?</h2><p>Most orders arrive within 7–14 business days, depending on region.</p><h2>Can I commission a custom piece?</h2><p>Reach out via the contact page with your subject and dimensions.</p>",
      metaTitle: "FAQ",
      metaDescription:
        "Answers to the most common questions about our thangkas, shipping, and orders.",
    },
  },
  {
    id: "contact",
    label: "Contact",
    description: "How customers can reach you.",
    values: {
      title: "Contact us",
      slug: "contact",
      content:
        "<p>We respond to most inquiries within one business day.</p><h2>Email</h2><p>hello@example.com</p><h2>Studio</h2><p>Address, city, country</p>",
      metaTitle: "Contact",
      metaDescription:
        "Get in touch with our team for orders, custom commissions, or general questions.",
    },
  },
];

const STATUS_OPTIONS: {
  value: StaticPageStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "draft",
    label: "Draft",
    description: "Saved but hidden from the storefront.",
  },
  {
    value: "published",
    label: "Published",
    description: "Live at /pages/<slug> and indexable by search engines.",
  },
  {
    value: "active",
    label: "Active (legacy)",
    description: "Older flag preserved for pages migrated from previous setups.",
  },
];

const META_TITLE_MAX = 60;
const META_DESCRIPTION_MAX = 160;

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 220);
}

function statusTone(status: StaticPageStatus): "success" | "warning" | "info" {
  if (status === "published") return "success";
  if (status === "active") return "info";
  return "warning";
}

export function StaticPageForm({
  title,
  description,
  submitLabel,
  values,
  action,
  showTemplates = false,
}: StaticPageFormProps) {
  const [titleValue, setTitleValue] = useState(values.title);
  const [slugValue, setSlugValue] = useState(values.slug);
  const [slugLocked, setSlugLocked] = useState(values.slug.length > 0);
  const [contentValue, setContentValue] = useState(values.content);
  const [contentKey, setContentKey] = useState(0);
  const [statusValue, setStatusValue] = useState<StaticPageStatus>(values.status);
  const [metaTitleValue, setMetaTitleValue] = useState(values.metaTitle);
  const [metaDescriptionValue, setMetaDescriptionValue] = useState(
    values.metaDescription,
  );

  const derivedSlug = useMemo(
    () => (slugLocked ? slugValue : slugify(titleValue)),
    [slugLocked, slugValue, titleValue],
  );

  const statusHelp = useMemo(
    () => STATUS_OPTIONS.find((option) => option.value === statusValue)?.description,
    [statusValue],
  );

  function applyTemplate(templateId: TemplateId) {
    const template = TEMPLATES.find((entry) => entry.id === templateId);
    if (!template) return;
    setTitleValue(template.values.title);
    setSlugValue(template.values.slug);
    setSlugLocked(template.values.slug.length > 0);
    setContentValue(template.values.content);
    setContentKey((current) => current + 1);
    setMetaTitleValue(template.values.metaTitle);
    setMetaDescriptionValue(template.values.metaDescription);
  }

  return (
    <form action={action} className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className="admin-display text-2xl font-semibold"
              style={{ color: "var(--admin-text)" }}
            >
              {title}
            </h2>
            <Badge tone={statusTone(statusValue)}>{statusValue}</Badge>
          </div>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--admin-text-soft)" }}
          >
            {description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="primary" size="md">
            {submitLabel}
          </Button>
        </div>
      </header>

      {showTemplates ? (
        <Card>
          <CardHeader
            title="Start from a template"
            description="Pick a common page type to prefill title, slug, content, and SEO. You can edit anything afterwards."
          />
          <CardBody>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template.id)}
                  className="rounded-md p-3 text-left transition hover:opacity-90"
                  style={{
                    border: "1px solid var(--admin-border)",
                    background: "var(--admin-surface)",
                  }}
                >
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--admin-text)" }}
                  >
                    {template.label}
                  </p>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--admin-text-mute)" }}
                  >
                    {template.description}
                  </p>
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader
              title="Basics"
              description="The page title and the URL it lives at."
            />
            <CardBody className="grid gap-4 md:grid-cols-2">
              <Field
                label="Title"
                hint="Shown as the page heading and used to build the URL slug."
              >
                <Input
                  name="title"
                  required
                  value={titleValue}
                  onChange={(event) => setTitleValue(event.target.value)}
                  placeholder="About us"
                />
              </Field>

              <div className="space-y-2">
                <Field
                  label="Slug"
                  hint={
                    slugLocked
                      ? "Custom slug — uncheck below to follow the title again."
                      : "Auto-generated from the title. Tick below to set a custom one."
                  }
                >
                  <div
                    className="flex h-10 items-center gap-2 rounded-md px-3 text-sm"
                    style={{
                      border: "1px solid var(--admin-border-strong)",
                      background: slugLocked
                        ? "var(--admin-surface)"
                        : "var(--admin-surface-2)",
                    }}
                  >
                    <span style={{ color: "var(--admin-text-mute)" }}>
                      /pages/
                    </span>
                    <input
                      name="slug"
                      value={derivedSlug}
                      readOnly={!slugLocked}
                      onChange={(event) => setSlugValue(event.target.value)}
                      className="flex-1 bg-transparent outline-none"
                      style={{ color: "var(--admin-text)" }}
                      placeholder="about"
                    />
                  </div>
                </Field>
                <label
                  className="inline-flex items-center gap-2 text-xs"
                  style={{ color: "var(--admin-text-soft)" }}
                >
                  <input
                    type="checkbox"
                    checked={slugLocked}
                    onChange={(event) => {
                      const next = event.target.checked;
                      setSlugLocked(next);
                      if (next && !slugValue) {
                        setSlugValue(slugify(titleValue));
                      }
                    }}
                    className="h-4 w-4 rounded"
                    style={{ borderColor: "var(--admin-border-strong)" }}
                  />
                  Set a custom slug
                </label>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Content"
              description="Format with the toolbar — headings, lists, quotes, code, and inline images are supported."
            />
            <CardBody>
              <RichTextEditor
                key={contentKey}
                name="content"
                initialValue={contentValue}
                upload={{ bucket: "blog-images", target: "blog-inline" }}
              />
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card>
            <CardHeader title="Publishing" />
            <CardBody className="space-y-3">
              <Field label="Status" hint={statusHelp}>
                <Select
                  name="status"
                  value={statusValue}
                  onChange={(event) =>
                    setStatusValue(event.target.value as StaticPageStatus)
                  }
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <ul
                className="space-y-1 text-[11px]"
                style={{ color: "var(--admin-text-mute)" }}
              >
                {STATUS_OPTIONS.map((option) => (
                  <li key={option.value}>
                    <span
                      className="font-medium"
                      style={{ color: "var(--admin-text-soft)" }}
                    >
                      {option.label}
                    </span>
                    {" — "}
                    {option.description}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="SEO"
              description="Optional overrides for search results and shared links."
            />
            <CardBody className="space-y-4">
              <Field
                label="Meta title"
                hint={`${metaTitleValue.length}/${META_TITLE_MAX} characters. Falls back to the page title.`}
              >
                <Input
                  name="metaTitle"
                  value={metaTitleValue}
                  onChange={(event) => setMetaTitleValue(event.target.value)}
                  maxLength={180}
                  placeholder={titleValue || "About us"}
                />
              </Field>

              <Field
                label="Meta description"
                hint={`${metaDescriptionValue.length}/${META_DESCRIPTION_MAX} characters. A short summary shown in search results.`}
              >
                <Textarea
                  name="metaDescription"
                  rows={3}
                  value={metaDescriptionValue}
                  onChange={(event) =>
                    setMetaDescriptionValue(event.target.value)
                  }
                  maxLength={320}
                  placeholder="A one-sentence summary of the page."
                />
              </Field>
            </CardBody>
          </Card>
        </aside>
      </div>

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
          The slug auto-derives from the title unless you set a custom one.
        </span>
        <Button type="submit" variant="primary" size="md">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
