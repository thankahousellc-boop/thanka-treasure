"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, KeyboardEvent } from "react";
import { toast } from "sonner";

import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  Field,
  Icon,
  Input,
  Textarea,
} from "@/components/admin/ui";
import { resolveUrl } from "@/lib/storage/resolve-url";

import type { FrameActionState } from "./actions";

const initialFrameActionState: FrameActionState = { ok: true };

const ALLOWED_TYPES = new Set(["image/png", "image/svg+xml"]);
const MAX_BYTES = 5 * 1024 * 1024;

export type FrameFormValues = {
  name: string;
  slug: string;
  description: string;
  priceDeltaDollars: string;
  isActive: boolean;
  imageBucket: string | null;
  imagePath: string | null;
  cutoutX: number;
  cutoutY: number;
  cutoutWidth: number;
  cutoutHeight: number;
};

type Cutout = { x: number; y: number; width: number; height: number };

const PLACEHOLDER_PRODUCT_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 120'>` +
      `<defs><linearGradient id='g' x1='0' x2='0' y1='0' y2='1'>` +
      `<stop offset='0' stop-color='#c2a78a'/><stop offset='1' stop-color='#7a5b3a'/>` +
      `</linearGradient></defs>` +
      `<rect width='100' height='120' fill='url(#g)'/>` +
      `<text x='50' y='62' text-anchor='middle' font-family='serif' font-size='10' fill='#fff' opacity='.85'>artwork</text>` +
      `</svg>`,
  );

type FrameFormProps = {
  values: FrameFormValues;
  action: (
    state: FrameActionState,
    formData: FormData,
  ) => Promise<FrameActionState>;
  submitLabel: string;
  submittingLabel: string;
  cancelHref: string;
  deleteAction?: (formData: FormData) => Promise<void>;
  frameId?: string;
};

export function FrameForm({
  values,
  action,
  submitLabel,
  submittingLabel,
  cancelHref,
  deleteAction,
  frameId,
}: FrameFormProps) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialFrameActionState,
  );

  const [name, setName] = useState(values.name);
  const [slug, setSlug] = useState(values.slug);
  const [priceDelta, setPriceDelta] = useState(values.priceDeltaDollars);
  const [isActive, setIsActive] = useState(values.isActive);
  const [cutout, setCutout] = useState<Cutout>({
    x: values.cutoutX,
    y: values.cutoutY,
    width: values.cutoutWidth,
    height: values.cutoutHeight,
  });

  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (state && !state.ok && state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
  }, [state]);

  const existingUrl =
    values.imageBucket && values.imagePath
      ? resolveUrl({ bucket: values.imageBucket, path: values.imagePath })
      : null;

  const pickedUrl = useMemo(
    () => (pickedFile ? URL.createObjectURL(pickedFile) : null),
    [pickedFile],
  );

  useEffect(() => {
    if (!pickedUrl) return;
    return () => URL.revokeObjectURL(pickedUrl);
  }, [pickedUrl]);

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.has(file.type)) {
      return "Frame artwork must be a transparent PNG or SVG.";
    }
    if (file.size > MAX_BYTES) {
      return `Image is ${formatBytes(file.size)} — must be 5MB or smaller.`;
    }
    return null;
  }

  function clearPicked() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPickedFile(null);
  }

  function applyFile(file: File | null) {
    if (!file) {
      clearPicked();
      return;
    }
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setPickedFile(null);
      return;
    }
    setPickedFile(file);
    setRemoveExistingImage(false);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    applyFile(event.target.files?.[0] ?? null);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (event.dataTransfer?.types?.includes("Files")) setIsDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer?.files?.[0];
    if (!dropped || !fileInputRef.current) return;
    const error = validateFile(dropped);
    if (error) {
      toast.error(error);
      return;
    }
    const transfer = new DataTransfer();
    transfer.items.add(dropped);
    fileInputRef.current.files = transfer.files;
    applyFile(dropped);
  }

  function handleDropZoneKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  }

  const slugSuggestion = autoSlug(name);
  const slugDisplay = (slug.trim() ? autoSlug(slug) : slugSuggestion) || "";
  const previewUrl =
    pickedUrl ?? (removeExistingImage ? null : existingUrl);
  const showRemoveButton =
    Boolean(frameId) && Boolean(existingUrl) && !pickedFile && !removeExistingImage;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <form action={formAction} noValidate className="space-y-5 lg:col-span-2">
        {frameId ? (
          <input type="hidden" name="frameId" value={frameId} />
        ) : null}

        <Card>
          <CardHeader title="Frame details" />
          <CardBody className="space-y-4">
            <Field
              label="Name"
              hint="Shown on the product page (e.g. 'Brocade Silk · Maroon')."
            >
              <Input
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={120}
              />
            </Field>
            <Field
              label="Slug"
              hint={
                slugDisplay
                  ? `Will be saved as “${slugDisplay}”.`
                  : "Generated from the name when blank."
              }
            >
              <Input
                name="slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                maxLength={180}
                placeholder={slugSuggestion || "frame-slug"}
              />
            </Field>
            <Field
              label="Description"
              hint="Optional. Brief detail to help shoppers choose."
            >
              <Textarea
                name="description"
                rows={3}
                defaultValue={values.description}
                maxLength={2000}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Price add-on (USD)"
                hint="Set 0 if the frame is included."
              >
                <Input
                  name="priceDelta"
                  type="number"
                  min={0}
                  step="0.01"
                  value={priceDelta}
                  onChange={(event) => setPriceDelta(event.target.value)}
                />
              </Field>
              <div className="block space-y-1.5">
                <span
                  className="text-[12.5px] font-medium"
                  style={{ color: "var(--admin-text-soft)" }}
                >
                  Visibility
                </span>
                <label
                  className="flex h-10 cursor-pointer items-center gap-2.5 rounded-md px-3 text-sm"
                  style={{
                    background: "var(--admin-surface)",
                    border: "1px solid var(--admin-border-strong)",
                    color: "var(--admin-text)",
                  }}
                >
                  <input
                    type="checkbox"
                    name="isActive"
                    value="on"
                    checked={isActive}
                    onChange={(event) => setIsActive(event.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                  />
                  <span>
                    {isActive
                      ? "Active — assignable to products"
                      : "Hidden from product picker"}
                  </span>
                </label>
                <span
                  className="block text-[11px]"
                  style={{ color: "var(--admin-text-mute)" }}
                >
                  Inactive frames stay in the catalog but won&apos;t appear
                  on the storefront.
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Frame image"
            description="Transparent PNG or SVG up to 5MB. The center must be transparent so the product image shows through."
          />
          <CardBody className="space-y-3">
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={handleDropZoneKey}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="relative grid place-items-center overflow-hidden rounded-lg transition outline-none focus-visible:ring-2"
              style={{
                minHeight: 240,
                cursor: "pointer",
                border: isDragging
                  ? "2px dashed var(--admin-accent)"
                  : "1.5px dashed var(--admin-border-strong)",
                background: isDragging
                  ? "var(--admin-accent-soft)"
                  : "var(--admin-surface-2)",
              }}
              aria-label={
                previewUrl
                  ? "Replace frame image"
                  : "Upload frame image"
              }
            >
              {previewUrl ? (
                <>
                  <Image
                    src={previewUrl}
                    alt={name || "Frame preview"}
                    fill
                    sizes="(max-width: 980px) 100vw, 600px"
                    className="object-contain p-4"
                    unoptimized
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 py-2 text-[11px]"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))",
                      color: "#ffffff",
                    }}
                  >
                    <span className="truncate">
                      {pickedFile
                        ? `New: ${pickedFile.name} · ${formatBytes(pickedFile.size)}`
                        : "Current image"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Icon.Upload width={12} height={12} />
                      {pickedFile ? "Change" : "Replace"}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <span style={{ color: "var(--admin-text-soft)" }}>
                    <Icon.Upload width={26} height={26} />
                  </span>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--admin-text)" }}
                  >
                    {isDragging
                      ? "Drop to upload"
                      : "Drag image here or click to browse"}
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--admin-text-mute)" }}
                  >
                    Transparent PNG or SVG · up to 5MB
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                name="image"
                accept="image/png,image/svg+xml"
                onChange={handleInputChange}
                className="sr-only"
                tabIndex={-1}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {pickedFile ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={clearPicked}
                >
                  Cancel selection
                </Button>
              ) : null}
              {showRemoveButton ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setRemoveExistingImage(true)}
                >
                  Remove current image
                </Button>
              ) : null}
              {removeExistingImage ? (
                <>
                  <span className="text-xs" style={{ color: "#b3261e" }}>
                    Will remove the current image on save.
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRemoveExistingImage(false)}
                  >
                    Undo
                  </Button>
                  <input type="hidden" name="removeImage" value="on" />
                </>
              ) : null}
              {!pickedFile && !removeExistingImage && existingUrl ? (
                <span
                  className="text-[11px]"
                  style={{ color: "var(--admin-text-mute)" }}
                >
                  Leave blank to keep the current image.
                </span>
              ) : null}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Inner window"
            description="Drag the rectangle to position where the product image will show through. Drag the corners to resize."
          />
          <CardBody className="space-y-3">
            <CutoutEditor frameUrl={previewUrl} cutout={cutout} onChange={setCutout} />
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="X (%)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  value={cutout.x.toFixed(1)}
                  onChange={(e) =>
                    setCutout((c) => clampCutout({ ...c, x: parseFloat(e.target.value) || 0 }))
                  }
                />
              </Field>
              <Field label="Y (%)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  value={cutout.y.toFixed(1)}
                  onChange={(e) =>
                    setCutout((c) => clampCutout({ ...c, y: parseFloat(e.target.value) || 0 }))
                  }
                />
              </Field>
              <Field label="Width (%)">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  step="any"
                  value={cutout.width.toFixed(1)}
                  onChange={(e) =>
                    setCutout((c) =>
                      clampCutout({ ...c, width: parseFloat(e.target.value) || 1 }),
                    )
                  }
                />
              </Field>
              <Field label="Height (%)">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  step="any"
                  value={cutout.height.toFixed(1)}
                  onChange={(e) =>
                    setCutout((c) =>
                      clampCutout({ ...c, height: parseFloat(e.target.value) || 1 }),
                    )
                  }
                />
              </Field>
            </div>
            <input type="hidden" name="cutoutX" value={cutout.x.toFixed(2)} />
            <input type="hidden" name="cutoutY" value={cutout.y.toFixed(2)} />
            <input type="hidden" name="cutoutWidth" value={cutout.width.toFixed(2)} />
            <input type="hidden" name="cutoutHeight" value={cutout.height.toFixed(2)} />
          </CardBody>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? submittingLabel : submitLabel}
            </Button>
            <ButtonLink href={cancelHref} variant="secondary">
              Cancel
            </ButtonLink>
          </div>
          {deleteAction && frameId ? (
            <DeleteFrameForm action={deleteAction} frameId={frameId} />
          ) : null}
        </div>
      </form>

      <aside className="space-y-3">
        <Card>
          <CardHeader
            title="Live preview"
            description="Updates as you edit."
          />
          <CardBody className="space-y-3">
            <div
              className="relative grid aspect-square place-items-center overflow-hidden rounded-md"
              style={{
                background: "var(--admin-surface-2)",
                border: "1px solid var(--admin-border)",
              }}
            >
              {previewUrl ? (
                <>
                  <div
                    className="absolute overflow-hidden"
                    style={{
                      left: `${cutout.x}%`,
                      top: `${cutout.y}%`,
                      width: `${cutout.width}%`,
                      height: `${cutout.height}%`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={PLACEHOLDER_PRODUCT_IMAGE}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <Image
                    src={previewUrl}
                    alt={name || "Frame"}
                    width={400}
                    height={400}
                    className="relative h-full w-full object-contain"
                    unoptimized
                  />
                </>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <span style={{ color: "var(--admin-text-mute)" }}>
                    <Icon.Frame width={22} height={22} />
                  </span>
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--admin-text-mute)" }}
                  >
                    No image yet
                  </span>
                </div>
              )}
            </div>
            <div>
              <p
                className="text-sm font-medium"
                style={{ color: "var(--admin-text)" }}
              >
                {name || "Untitled frame"}
              </p>
              <p
                className="text-[11px]"
                style={{ color: "var(--admin-text-mute)" }}
              >
                {slugDisplay ? `/${slugDisplay}` : "Slug pending"}
              </p>
            </div>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between">
                <dt style={{ color: "var(--admin-text-mute)" }}>Status</dt>
                <dd style={{ color: "var(--admin-text)" }}>
                  {isActive ? "Active" : "Hidden"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "var(--admin-text-mute)" }}>Price add-on</dt>
                <dd style={{ color: "var(--admin-text)" }}>
                  {formatPriceAddon(priceDelta)}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      </aside>
    </div>
  );
}

function DeleteFrameForm({
  action,
  frameId,
}: {
  action: (formData: FormData) => Promise<void>;
  frameId: string;
}) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm("Delete this frame? This cannot be undone.")) {
      event.preventDefault();
    }
  }
  return (
    <form action={action} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={frameId} />
      <Button type="submit" variant="danger" size="sm">
        Delete frame
      </Button>
    </form>
  );
}

function autoSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatPriceAddon(input: string) {
  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0) return "Included";
  return `+$${value.toFixed(2)}`;
}

function clampCutout(c: Cutout): Cutout {
  const width = Math.max(1, Math.min(100, c.width));
  const height = Math.max(1, Math.min(100, c.height));
  const x = Math.max(0, Math.min(100 - width, c.x));
  const y = Math.max(0, Math.min(100 - height, c.y));
  return { x, y, width, height };
}

type Handle = "move" | "nw" | "ne" | "sw" | "se";

function CutoutEditor({
  frameUrl,
  cutout,
  onChange,
}: {
  frameUrl: string | null;
  cutout: Cutout;
  onChange: (next: Cutout) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    handle: Handle;
    startX: number;
    startY: number;
    start: Cutout;
    boxW: number;
    boxH: number;
  } | null>(null);

  function beginDrag(handle: Handle, e: React.PointerEvent) {
    if (!boxRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = boxRef.current.getBoundingClientRect();
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      start: { ...cutout },
      boxW: rect.width,
      boxH: rect.height,
    };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = ((e.clientX - drag.startX) / drag.boxW) * 100;
    const dy = ((e.clientY - drag.startY) / drag.boxH) * 100;
    const s = drag.start;
    let next: Cutout = { ...s };
    switch (drag.handle) {
      case "move":
        next = { ...s, x: s.x + dx, y: s.y + dy };
        break;
      case "nw":
        next = {
          x: s.x + dx,
          y: s.y + dy,
          width: s.width - dx,
          height: s.height - dy,
        };
        break;
      case "ne":
        next = { x: s.x, y: s.y + dy, width: s.width + dx, height: s.height - dy };
        break;
      case "sw":
        next = { x: s.x + dx, y: s.y, width: s.width - dx, height: s.height + dy };
        break;
      case "se":
        next = { x: s.x, y: s.y, width: s.width + dx, height: s.height + dy };
        break;
    }
    onChange(clampCutout(next));
  }

  function endDrag(e: React.PointerEvent) {
    dragRef.current = null;
    if ((e.currentTarget as Element).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    }
  }

  return (
    <div
      ref={boxRef}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="relative aspect-square overflow-hidden rounded-md select-none"
      style={{
        background:
          "repeating-conic-gradient(var(--admin-surface-2) 0 25%, transparent 0 50%) 50% 50% / 16px 16px",
        border: "1px solid var(--admin-border)",
        touchAction: "none",
      }}
    >
      <div
        className="absolute overflow-hidden"
        style={{
          left: `${cutout.x}%`,
          top: `${cutout.y}%`,
          width: `${cutout.width}%`,
          height: `${cutout.height}%`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PLACEHOLDER_PRODUCT_IMAGE}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      {frameUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={frameUrl}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-[11px]" style={{ color: "var(--admin-text-mute)" }}>
          Upload an image to position the inner window.
        </div>
      )}
      <div
        onPointerDown={(e) => beginDrag("move", e)}
        className="absolute cursor-move"
        style={{
          left: `${cutout.x}%`,
          top: `${cutout.y}%`,
          width: `${cutout.width}%`,
          height: `${cutout.height}%`,
          border: "2px dashed var(--admin-accent)",
          background: "rgba(255,255,255,0.05)",
        }}
      >
        {(["nw", "ne", "sw", "se"] as const).map((h) => (
          <div
            key={h}
            onPointerDown={(e) => beginDrag(h, e)}
            className="absolute h-3 w-3 rounded-sm"
            style={{
              background: "var(--admin-accent)",
              border: "1.5px solid #fff",
              cursor:
                h === "nw" || h === "se" ? "nwse-resize" : "nesw-resize",
              left: h === "nw" || h === "sw" ? -6 : "auto",
              right: h === "ne" || h === "se" ? -6 : "auto",
              top: h === "nw" || h === "ne" ? -6 : "auto",
              bottom: h === "sw" || h === "se" ? -6 : "auto",
            }}
          />
        ))}
      </div>
    </div>
  );
}
