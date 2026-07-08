"use client";

import Image from "next/image";
import type { DragEvent } from "react";
import { useRef, useState } from "react";

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Icon,
  Input,
  Select,
  SubmitButton,
} from "@/components/admin/ui";
import { resolveUrl } from "@/lib/storage";

import {
  addProductImageAction,
  deleteProductImageAction,
  moveProductImageDownAction,
  moveProductImageUpAction,
  updateProductImageMetaAction,
} from "./actions";

type Variant = {
  id: string;
  title: string;
  sku: string | null;
};

type ProductImage = {
  id: string;
  variantId: string | null;
  bucket: string;
  path: string;
  altText: string | null;
  position: number;
};

type ProductImageManagerProps = {
  productId: string;
  variants: Variant[];
  images: ProductImage[];
};

export function ProductImageManager({
  productId,
  variants,
  images,
}: ProductImageManagerProps) {
  const addImage = addProductImageAction.bind(null, productId);
  const updateImageMeta = updateProductImageMetaAction.bind(null, productId);
  const moveImageUp = moveProductImageUpAction.bind(null, productId);
  const moveImageDown = moveProductImageDownAction.bind(null, productId);
  const deleteImage = deleteProductImageAction.bind(null, productId);

  const [activeId, setActiveId] = useState<string | null>(
    images[0]?.id ?? null,
  );

  const active =
    images.find((image) => image.id === activeId) ?? images[0] ?? null;

  return (
    <Card>
      <CardHeader
        title="Product images"
        description="Click a thumbnail to preview. Edit alt text and reorder below."
      />
      <CardBody className="space-y-5">
        <UploadForm action={addImage} variants={variants} />

        {images.length > 0 && active ? (
          <Gallery
            active={active}
            images={images}
            variants={variants}
            activeId={activeId}
            onSelectActive={setActiveId}
            updateImageMeta={updateImageMeta}
            moveImageUp={moveImageUp}
            moveImageDown={moveImageDown}
            deleteImage={deleteImage}
          />
        ) : (
          <EmptyState
            icon={<Icon.Image width={28} height={28} />}
            title="No images yet."
            description="Upload the first image to start building this product's gallery."
          />
        )}
      </CardBody>
    </Card>
  );
}

type UploadFormProps = {
  action: (formData: FormData) => Promise<void>;
  variants: Variant[];
};

function UploadForm({ action, variants }: UploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pickedName, setPickedName] = useState<string | null>(null);

  function handleDragEnter(event: DragEvent<HTMLFormElement>) {
    event.preventDefault();
    if (event.dataTransfer?.types?.includes("Files")) {
      setIsDragging(true);
    }
  }

  function handleDragOver(event: DragEvent<HTMLFormElement>) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDragLeave(event: DragEvent<HTMLFormElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer?.files;
    if (!dropped || dropped.length === 0 || !fileInputRef.current) {
      return;
    }
    const file = dropped[0];
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      return;
    }
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInputRef.current.files = transfer.files;
    setPickedName(file.name);
  }

  return (
    <form
      action={action}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-wrap items-center gap-2 rounded-md px-2 py-2 transition"
      style={{
        background: isDragging
          ? "var(--admin-accent-soft)"
          : "var(--admin-surface-2)",
        border: isDragging
          ? "1px dashed var(--admin-accent)"
          : "1px solid var(--admin-border)",
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        name="file"
        accept="image/jpeg,image/png,image/webp"
        required
        onChange={(event) =>
          setPickedName(event.target.files?.[0]?.name ?? null)
        }
        className="min-w-0 flex-1 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-(--admin-accent) file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:brightness-110"
        style={{ color: "var(--admin-text-soft)" }}
      />

      <Select
        name="variantId"
        defaultValue=""
        aria-label="Assign variant"
        className="h-8 max-w-44 text-xs"
      >
        <option value="">Unassigned (shared)</option>
        {variants.map((variant) => (
          <option key={variant.id} value={variant.id}>
            {variant.title}
            {variant.sku ? ` · ${variant.sku}` : ""}
          </option>
        ))}
      </Select>

      <SubmitButton variant="primary" size="sm" pendingLabel="Uploading…">
        <Icon.Upload width={14} height={14} />
        <span>Upload</span>
      </SubmitButton>

      <span
        className="basis-full text-[11px]"
        style={{ color: "var(--admin-text-mute)" }}
      >
        {pickedName
          ? `Ready: ${pickedName}`
          : "Drag an image here or pick one. JPEG, PNG, or WEBP. Max 5MB. Alt text and ordering are set below."}
      </span>
    </form>
  );
}

type GalleryProps = {
  active: ProductImage;
  images: ProductImage[];
  variants: Variant[];
  activeId: string | null;
  onSelectActive: (id: string) => void;
  updateImageMeta: (formData: FormData) => Promise<void>;
  moveImageUp: (formData: FormData) => Promise<void>;
  moveImageDown: (formData: FormData) => Promise<void>;
  deleteImage: (formData: FormData) => Promise<void>;
};

function Gallery({
  active,
  images,
  variants,
  activeId,
  onSelectActive,
  updateImageMeta,
  moveImageUp,
  moveImageDown,
  deleteImage,
}: GalleryProps) {
  const activeUrl = resolveUrl({ bucket: active.bucket, path: active.path });
  const activeVariant = variants.find(
    (variant) => variant.id === active.variantId,
  );
  const activeIndex = images.findIndex((image) => image.id === active.id);
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === images.length - 1;

  return (
    <div className="grid items-start gap-4 md:grid-cols-[96px_minmax(0,1fr)]">
      <div className="md:flex md:flex-col md:gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
          {images.map((image, index) => {
            const url = resolveUrl({ bucket: image.bucket, path: image.path });
            const isSelected = image.id === activeId;
            return (
              <button
                key={image.id}
                type="button"
                onClick={() => onSelectActive(image.id)}
                aria-label={`Preview image ${index + 1}`}
                aria-current={isSelected ? "true" : undefined}
                className="relative aspect-square w-22 shrink-0 overflow-hidden rounded-md transition"
                style={{
                  background: "var(--admin-surface-2)",
                  border: isSelected
                    ? "2px solid var(--admin-accent)"
                    : "1px solid var(--admin-border-strong)",
                  outline: isSelected
                    ? "2px solid var(--admin-accent-soft)"
                    : "none",
                  outlineOffset: 2,
                }}
              >
                {url ? (
                  <Image
                    src={url}
                    alt={image.altText ?? ""}
                    fill
                    sizes="88px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span
                    className="grid h-full w-full place-items-center text-[10px]"
                    style={{ color: "var(--admin-text-mute)" }}
                  >
                    No preview
                  </span>
                )}
                <span
                  className="absolute bottom-1 left-1 rounded px-1 text-[10px] font-medium"
                  style={{
                    background: "rgba(255,255,255,0.85)",
                    color: "#2b1318",
                  }}
                >
                  {index + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div
          className="relative aspect-4/5 overflow-hidden rounded-lg"
          style={{
            background: "var(--admin-surface-2)",
            border: "1px solid var(--admin-border-strong)",
          }}
        >
          {activeUrl ? (
            <Image
              src={activeUrl}
              alt={active.altText ?? "Product image"}
              fill
              priority
              sizes="(max-width: 980px) 100vw, 50vw"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div
              className="grid h-full w-full place-items-center text-sm"
              style={{ color: "var(--admin-text-mute)" }}
            >
              Preview unavailable
            </div>
          )}

          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <Badge tone="neutral">Position {active.position}</Badge>
            {activeVariant ? (
              <Badge tone="info">
                {activeVariant.title}
                {activeVariant.sku ? ` · ${activeVariant.sku}` : ""}
              </Badge>
            ) : (
              <Badge tone="muted">Shared image</Badge>
            )}
          </div>

          <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
            <IconActionForm
              action={moveImageUp}
              imageId={active.id}
              label="Move up"
              disabled={isFirst}
              icon={<Icon.ChevronDown style={{ transform: "rotate(180deg)" }} />}
            />
            <IconActionForm
              action={moveImageDown}
              imageId={active.id}
              label="Move down"
              disabled={isLast}
              icon={<Icon.ChevronDown />}
            />
            <IconActionForm
              action={deleteImage}
              imageId={active.id}
              label="Delete image"
              icon={<Icon.Close />}
              tone="danger"
              confirmMessage="Delete this image? This cannot be undone."
            />
          </div>
        </div>

        <form
          action={updateImageMeta}
          className="grid gap-3 rounded-lg p-3 md:grid-cols-[1fr_220px_auto] md:items-end"
          style={{
            background: "var(--admin-surface-2)",
            border: "1px solid var(--admin-border)",
          }}
        >
          <input type="hidden" name="imageId" value={active.id} />

          <Field label="Alt text">
            <Input
              name="altText"
              key={`alt-${active.id}`}
              defaultValue={active.altText ?? ""}
              maxLength={220}
              placeholder="Describe this image"
            />
          </Field>

          <Field label="Variant">
            <Select
              name="variantId"
              key={`variant-${active.id}`}
              defaultValue={active.variantId ?? ""}
            >
              <option value="">Unassigned</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.title}
                  {variant.sku ? ` · ${variant.sku}` : ""}
                </option>
              ))}
            </Select>
          </Field>

          <SubmitButton variant="primary" size="md">
            Save
          </SubmitButton>
        </form>

        <p className="text-[11px]" style={{ color: "var(--admin-text-mute)" }}>
          {active.bucket}/{active.path}
        </p>
      </div>
    </div>
  );
}

type IconActionFormProps = {
  action: (formData: FormData) => Promise<void>;
  imageId: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  tone?: "default" | "danger";
  confirmMessage?: string;
};

function IconActionForm({
  action,
  imageId,
  label,
  icon,
  disabled,
  tone = "default",
  confirmMessage,
}: IconActionFormProps) {
  // Floating control sits on a fixed white chip over the image, so its icon
  // must stay dark in both themes (var(--admin-text) goes near-white in dark).
  const baseColor = tone === "danger" ? "#b3261e" : "#2b1318";
  const baseBg = "rgba(255, 255, 255, 0.92)";
  const hoverBg =
    tone === "danger" ? "rgba(179, 38, 30, 0.12)" : "var(--admin-accent-soft)";

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          confirmMessage &&
          !window.confirm(confirmMessage)
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="imageId" value={imageId} />
      <button
        type="submit"
        disabled={disabled}
        title={label}
        aria-label={label}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md backdrop-blur-sm transition disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          color: baseColor,
          background: baseBg,
          border: "1px solid var(--admin-border-strong)",
        }}
        onMouseEnter={(event) => {
          if (!disabled) {
            event.currentTarget.style.backgroundColor = hoverBg;
          }
        }}
        onMouseLeave={(event) => {
          if (!disabled) {
            event.currentTarget.style.backgroundColor = baseBg;
          }
        }}
      >
        {icon}
      </button>
    </form>
  );
}
