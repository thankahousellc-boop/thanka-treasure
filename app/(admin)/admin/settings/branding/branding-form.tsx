"use client";

import Image from "next/image";
import { useState } from "react";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Select,
} from "@/components/admin/ui";

const fontOptions = [
  { value: "inter", label: "Inter (clean sans)" },
  { value: "cormorant", label: "Cormorant Garamond (display serif)" },
];

type BrandingFormValues = {
  brandName: string;
  brandTagline: string;
  bodyFont: string;
  displayFont: string;
  colors: {
    ink: string;
    inkSoft: string;
    inkMute: string;
    paper: string;
    paper2: string;
    saffron: string;
    gold: string;
  };
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
};

type BrandingFormProps = {
  values: BrandingFormValues;
  action: (formData: FormData) => Promise<void>;
};

const colorRows: Array<{ key: keyof BrandingFormValues["colors"]; label: string; hint: string }> = [
  { key: "ink", label: "Ink (primary)", hint: "Buttons, headings" },
  { key: "inkSoft", label: "Ink soft", hint: "Body copy, secondary text" },
  { key: "inkMute", label: "Ink muted", hint: "Captions, subtle UI" },
  { key: "paper", label: "Paper", hint: "Page background" },
  { key: "paper2", label: "Paper 2", hint: "Cards, surfaces" },
  { key: "saffron", label: "Saffron", hint: "Eyebrow accents" },
  { key: "gold", label: "Gold", hint: "Highlights" },
];

export function BrandingForm({ values, action }: BrandingFormProps) {
  const [colors, setColors] = useState(values.colors);

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader title="Identity" />
          <CardBody className="space-y-4">
            <Field label="Brand name">
              <Input name="brandName" defaultValue={values.brandName} required />
            </Field>
            <Field label="Tagline" hint="Optional. Shown below the brand name in some places.">
              <Input name="brandTagline" defaultValue={values.brandTagline} />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Logo"
            description="JPEG, PNG, WEBP, or SVG up to 2MB. The light variant is shown on light surfaces; the dark variant on dark surfaces."
          />
          <CardBody className="grid gap-4 md:grid-cols-2">
            <LogoSlot
              name="logoLight"
              removeName="removeLogoLight"
              label="Logo (light surfaces)"
              currentUrl={values.logoLightUrl}
              previewBg="bg-white"
            />
            <LogoSlot
              name="logoDark"
              removeName="removeLogoDark"
              label="Logo (dark surfaces)"
              currentUrl={values.logoDarkUrl}
              previewBg="bg-zinc-900"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Colors" description="Hex values applied as CSS variables across the storefront." />
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2">
              {colorRows.map((row) => (
                <Field key={row.key} label={row.label} hint={row.hint}>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colors[row.key]}
                      onChange={(event) =>
                        setColors((current) => ({
                          ...current,
                          [row.key]: event.target.value,
                        }))
                      }
                      className="h-10 w-12 cursor-pointer rounded border border-zinc-300"
                    />
                    <Input
                      name={row.key}
                      value={colors[row.key]}
                      onChange={(event) =>
                        setColors((current) => ({
                          ...current,
                          [row.key]: event.target.value,
                        }))
                      }
                      pattern="#([0-9a-fA-F]{3}){1,2}"
                      required
                      className="font-mono uppercase"
                    />
                  </div>
                </Field>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Typography" />
          <CardBody className="grid gap-4 md:grid-cols-2">
            <Field label="Body font">
              <Select name="bodyFont" defaultValue={values.bodyFont}>
                {fontOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Display font">
              <Select name="displayFont" defaultValue={values.displayFont}>
                {fontOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">Save branding</Button>
        </div>
      </div>

      <aside className="space-y-3">
        <Card>
          <CardHeader title="Preview" />
          <CardBody>
            <div
              className="rounded-md p-5 text-sm shadow-sm"
              style={{
                backgroundColor: colors.paper,
                color: colors.ink,
                border: `1px solid ${colors.paper2}`,
              }}
            >
              <p
                className="text-xs uppercase tracking-widest"
                style={{ color: colors.saffron }}
              >
                Eyebrow
              </p>
              <p
                className="mt-1 font-serif text-2xl"
                style={{ color: colors.ink }}
              >
                {values.brandName || "Brand"}
              </p>
              <p className="mt-1 text-sm" style={{ color: colors.inkSoft }}>
                A heritage atelier of one-of-one Thangka paintings.
              </p>
              <p className="mt-3 text-xs" style={{ color: colors.inkMute }}>
                Soft tertiary text uses ink-mute.
              </p>
              <button
                type="button"
                className="mt-4 inline-flex items-center rounded-full px-4 py-2 text-xs font-medium uppercase tracking-widest"
                style={{
                  backgroundColor: colors.ink,
                  color: colors.paper,
                }}
              >
                Add to cart
              </button>
            </div>
          </CardBody>
        </Card>
      </aside>
    </form>
  );
}

function LogoSlot({
  name,
  removeName,
  label,
  currentUrl,
  previewBg,
}: {
  name: string;
  removeName: string;
  label: string;
  currentUrl: string | null;
  previewBg: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-zinc-700">{label}</p>
      <div
        className={`grid h-24 place-items-center rounded border border-zinc-200 ${previewBg}`}
      >
        {currentUrl ? (
          <Image
            src={currentUrl}
            alt={label}
            width={120}
            height={60}
            className="max-h-16 w-auto object-contain"
            unoptimized
          />
        ) : (
          <span className="text-xs text-zinc-400">No logo uploaded</span>
        )}
      </div>
      <input
        type="file"
        name={name}
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="block w-full text-xs text-zinc-600 file:mr-2 file:rounded file:border-0 file:bg-zinc-900 file:px-2 file:py-1.5 file:text-xs file:font-medium file:text-white"
      />
      {currentUrl ? (
        <label className="flex items-center gap-2 text-xs text-zinc-600">
          <input
            type="checkbox"
            name={removeName}
            value="on"
            className="h-3.5 w-3.5 rounded border-zinc-300"
          />
          Remove current logo
        </label>
      ) : null}
    </div>
  );
}
