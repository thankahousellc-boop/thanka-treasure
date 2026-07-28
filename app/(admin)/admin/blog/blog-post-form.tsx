"use client";

import Image from "next/image";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DirtyForm,
  Field,
  Icon,
  Input,
  RichTextEditor,
  Select,
  ShowWhenDirty,
  Textarea,
} from "@/components/admin/ui";

type BlogPostStatus = "draft" | "published" | "scheduled";

type BlogPostFormValues = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImageAlt: string;
  featuredImageUrl: string;
  status: BlogPostStatus;
  scheduledAt: string;
  categoryIds: string[];
  tagIds: string[];
};

type BlogTaxonomyOption = {
  id: string;
  name: string;
  slug: string;
};

export type BlogPostActionState = {
  error?: string | null;
  fieldErrors?: Partial<Record<keyof BlogPostFormValues, string>>;
} | null;

type BlogPostFormProps = {
  title: string;
  description: string;
  submitLabel: string;
  values: BlogPostFormValues;
  categories: BlogTaxonomyOption[];
  tags: BlogTaxonomyOption[];
  action: (
    state: BlogPostActionState,
    formData: FormData,
  ) => Promise<BlogPostActionState>;
};

const STATUS_OPTIONS: ReadonlyArray<{
  value: BlogPostStatus;
  label: string;
  description: string;
}> = [
  { value: "draft", label: "Draft", description: "Hidden from readers." },
  {
    value: "published",
    label: "Published",
    description: "Live immediately after saving.",
  },
  {
    value: "scheduled",
    label: "Scheduled",
    description: "Goes live at the chosen time.",
  },
];

function statusTone(status: BlogPostStatus): "success" | "warning" | "info" {
  if (status === "published") return "success";
  if (status === "scheduled") return "info";
  return "warning";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function BlogPostForm({
  title,
  description,
  submitLabel,
  values,
  categories,
  tags,
  action,
}: BlogPostFormProps) {
  const [state, formAction, isPending] = useActionState<
    BlogPostActionState,
    FormData
  >(action, null);

  const [status, setStatus] = useState<BlogPostStatus>(values.status);
  const [removeImage, setRemoveImage] = useState(false);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(() => {
    if (!pickedFile) return null;
    return URL.createObjectURL(pickedFile);
  }, [pickedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const showExistingImage =
    Boolean(values.featuredImageUrl) && !pickedFile && !removeImage;

  const handleChip = (next: BlogPostStatus) => {
    setStatus(next);
  };

  const setFileOnInput = (file: File | null) => {
    if (!fileInputRef.current) return;
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
    } else {
      fileInputRef.current.value = "";
    }
    setPickedFile(file);
    if (file) setRemoveImage(false);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) setFileOnInput(file);
  };

  const errorMessage = state?.error;

  return (
    <DirtyForm action={formAction} className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className="admin-display text-2xl font-semibold"
              style={{ color: "var(--admin-text)" }}
            >
              {title}
            </h2>
            <Badge tone={statusTone(status)}>{status}</Badge>
          </div>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--admin-text-soft)" }}
          >
            {description}
          </p>
        </div>
      </header>

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-md px-3 py-2 text-[13px]"
          style={{
            background: "rgba(179, 38, 30, 0.08)",
            border: "1px solid rgba(179, 38, 30, 0.32)",
            color: "#8a1f17",
          }}
        >
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader
              title="Basics"
              description="Title, slug, and excerpt shown on the storefront."
            />
            <CardBody className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <Field
                  className="md:col-span-2"
                  label="Title"
                  hint="Shown to readers and used to build the URL slug."
                >
                  <Input
                    name="title"
                    required
                    defaultValue={values.title}
                    placeholder="A guide to choosing your first thanka"
                  />
                </Field>
                <Field label="Slug" hint="Leave blank to auto-generate.">
                  <Input
                    name="slug"
                    defaultValue={values.slug}
                    placeholder="choosing-your-first-thanka"
                  />
                </Field>
              </div>

              <Field
                label="Excerpt"
                hint="Optional short summary used in cards and SEO previews."
              >
                <Textarea
                  name="excerpt"
                  rows={2}
                  defaultValue={values.excerpt}
                  placeholder="A short blurb that appears alongside this post."
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Content"
              description="Format with the toolbar — headings, lists, quotes, code, and inline images are supported."
            />
            <CardBody>
              <RichTextEditor
                name="content"
                initialValue={values.content}
                upload={{ bucket: "blog-images", target: "blog-inline" }}
              />
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Publishing" />
            <CardBody className="space-y-3">
              <input type="hidden" name="status" value={status} />

              <div>
                <span
                  className="mb-1.5 block text-[12px] font-medium"
                  style={{ color: "var(--admin-text-soft)" }}
                >
                  Status
                </span>
                <div
                  role="radiogroup"
                  aria-label="Status"
                  className="grid grid-cols-3 gap-1 rounded-md p-1"
                  style={{
                    backgroundColor: "var(--admin-surface-2)",
                    border: "1px solid var(--admin-border-strong)",
                  }}
                >
                  {STATUS_OPTIONS.map((option) => {
                    const isActive = option.value === status;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        onClick={() => handleChip(option.value)}
                        className="rounded px-2 py-1.5 text-[12px] font-medium transition"
                        style={{
                          backgroundColor: isActive
                            ? "var(--admin-accent)"
                            : "transparent",
                          color: isActive
                            ? "var(--admin-on-accent)"
                            : "var(--admin-text-soft)",
                          boxShadow: isActive
                            ? "0 1px 2px rgba(0,0,0,0.08)"
                            : "none",
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <p
                  className="mt-1 text-[11px] leading-snug"
                  style={{ color: "var(--admin-text-mute)" }}
                >
                  {
                    STATUS_OPTIONS.find((option) => option.value === status)
                      ?.description
                  }
                </p>
              </div>

              {status === "scheduled" ? (
                <Field
                  label="Scheduled at"
                  hint="Required when status is Scheduled."
                >
                  <Input
                    name="scheduledAt"
                    type="datetime-local"
                    defaultValue={values.scheduledAt}
                    required
                  />
                </Field>
              ) : (
                <input
                  type="hidden"
                  name="scheduledAt"
                  value={values.scheduledAt}
                />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Featured image" />
            <CardBody className="space-y-3">
              <input
                ref={fileInputRef}
                name="featuredImage"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] ?? null;
                  setPickedFile(file);
                  if (file) setRemoveImage(false);
                }}
              />

              {showExistingImage ? (
                <div
                  className="relative h-32 w-full overflow-hidden rounded-md"
                  style={{
                    border: "1px solid var(--admin-border)",
                    backgroundColor: "var(--admin-surface-2)",
                  }}
                >
                  <Image
                    src={values.featuredImageUrl}
                    alt={values.featuredImageAlt || "Featured image preview"}
                    fill
                    sizes="320px"
                    className="object-cover"
                  />
                </div>
              ) : null}

              {pickedFile && previewUrl ? (
                <div
                  className="relative overflow-hidden rounded-md"
                  style={{
                    border: "1px solid var(--admin-border)",
                    backgroundColor: "var(--admin-surface-2)",
                  }}
                >
                  <div className="relative h-32 w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt={pickedFile.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                  <div
                    className="flex items-center justify-between gap-2 px-2 py-1.5 text-[11.5px]"
                    style={{
                      borderTop: "1px solid var(--admin-border)",
                      color: "var(--admin-text-soft)",
                    }}
                  >
                    <span className="min-w-0 truncate">
                      {pickedFile.name} · {formatBytes(pickedFile.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFileOnInput(null)}
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition hover:brightness-110"
                      style={{
                        color: "var(--admin-text-soft)",
                        backgroundColor: "var(--admin-accent-soft)",
                      }}
                    >
                      <Icon.Close width={12} height={12} /> Clear
                    </button>
                  </div>
                </div>
              ) : null}

              <label
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md px-4 py-5 text-center transition"
                style={{
                  border: `1.5px dashed ${
                    isDragging
                      ? "var(--admin-accent)"
                      : "var(--admin-border-strong)"
                  }`,
                  backgroundColor: isDragging
                    ? "var(--admin-accent-soft)"
                    : "var(--admin-surface-2)",
                }}
                onClick={(event) => {
                  // The hidden input is a sibling, not a descendant — trigger manually.
                  event.preventDefault();
                  fileInputRef.current?.click();
                }}
              >
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: "var(--admin-accent-soft)",
                    color: "var(--admin-accent)",
                  }}
                >
                  <Icon.Upload width={18} height={18} />
                </span>
                <span
                  className="text-[12.5px] font-medium"
                  style={{ color: "var(--admin-text)" }}
                >
                  {pickedFile
                    ? "Replace image"
                    : showExistingImage
                      ? "Replace image"
                      : "Click to upload or drag & drop"}
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: "var(--admin-text-mute)" }}
                >
                  JPEG, PNG, or WEBP · max 5 MB
                </span>
              </label>

              <Field label="Alt text">
                <Input
                  name="featuredImageAlt"
                  defaultValue={values.featuredImageAlt}
                  placeholder="Describe the image"
                />
              </Field>

              {values.featuredImageUrl ? (
                <label
                  className="inline-flex items-center gap-2 text-xs"
                  style={{ color: "var(--admin-text-soft)" }}
                >
                  <input
                    type="checkbox"
                    name="removeFeaturedImage"
                    value="1"
                    checked={removeImage}
                    onChange={(event) => {
                      const next = event.currentTarget.checked;
                      setRemoveImage(next);
                      if (next) setFileOnInput(null);
                    }}
                    className="h-4 w-4 rounded"
                    style={{ borderColor: "var(--admin-border-strong)" }}
                  />
                  Remove existing image
                </label>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Organization" />
            <CardBody className="space-y-3">
              <Field label="Categories" hint="Cmd/Ctrl-click for multiple.">
                <Select
                  name="categoryIds"
                  multiple
                  defaultValue={values.categoryIds}
                  className="min-h-24 py-1.5"
                >
                  {categories.length > 0 ? (
                    categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))
                  ) : (
                    <option disabled value="">
                      No categories
                    </option>
                  )}
                </Select>
              </Field>
              <Field label="Tags">
                <Select
                  name="tagIds"
                  multiple
                  defaultValue={values.tagIds}
                  className="min-h-24 py-1.5"
                >
                  {tags.length > 0 ? (
                    tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))
                  ) : (
                    <option disabled value="">
                      No tags
                    </option>
                  )}
                </Select>
              </Field>
            </CardBody>
          </Card>
        </aside>
      </div>

      <ShowWhenDirty>
        <div
          className="sticky bottom-3 grid items-center gap-4 rounded-md px-4 py-3 lg:grid-cols-[minmax(0,1fr)_320px]"
          style={{
            background: "var(--admin-surface)",
            border: "1px solid var(--admin-border)",
            boxShadow: "var(--admin-shadow-lg)",
          }}
        >
          <span className="text-xs" style={{ color: "var(--admin-text-mute)" }}>
            The URL slug is generated from the title when left blank.
          </span>
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isPending}
            >
              {isPending ? "Saving…" : submitLabel}
            </Button>
          </div>
        </div>
      </ShowWhenDirty>
    </DirtyForm>
  );
}
