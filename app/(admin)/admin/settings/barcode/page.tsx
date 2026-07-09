import { FlashToast } from "@/components/admin/flash-toast";
import {
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  SubmitButton,
} from "@/components/admin/ui";
import { getBarcodeConfig } from "@/lib/barcode/config";
import { attributeRepository } from "@/lib/repositories/attribute-repository";

import { saveBarcodeConfigAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminBarcodeSettingsPage() {
  const [definitions, config] = await Promise.all([
    attributeRepository.listDefinitions(),
    getBarcodeConfig(),
  ]);

  return (
    <section className="space-y-5">
      <FlashToast messages={{ saved: "Barcode settings saved." }} />
      <header>
        <h2
          className="admin-display text-2xl font-semibold"
          style={{ color: "var(--admin-text)" }}
        >
          Barcode settings
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--admin-text-soft)" }}>
          The scannable code is kept short — an optional prefix plus a unique
          product suffix — so it stays readable on a 1D scanner. Attributes
          selected below set the order product details print as text on the
          label. Saving regenerates every product&apos;s barcode.
        </p>
      </header>

      <form action={saveBarcodeConfigAction}>
        <Card>
          <CardHeader
            title="Label layout"
            description="Checked attributes print first, in list order. Unchecked attributes still print, after the ordered ones."
          />
          <CardBody className="space-y-4">
            {definitions.length > 0 ? (
              <div className="space-y-2">
                {definitions.map((definition) => (
                  <label
                    key={definition.id}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: "var(--admin-text-soft)" }}
                  >
                    <input
                      type="checkbox"
                      name="attributeKeys"
                      value={definition.key}
                      defaultChecked={config.attributeKeys.includes(
                        definition.key,
                      )}
                    />
                    {definition.name}
                    <span style={{ color: "var(--admin-text-mute)" }}>
                      ({definition.key})
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p
                className="text-sm"
                style={{ color: "var(--admin-text-soft)" }}
              >
                No attributes defined yet. Add some under Attributes first.
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Prefix (optional)" hint="e.g. a store code.">
                <Input name="prefix" defaultValue={config.prefix} placeholder="TT" />
              </Field>
              <Field label="Separator">
                <Input
                  name="separator"
                  defaultValue={config.separator}
                  placeholder="-"
                  maxLength={3}
                />
              </Field>
            </div>

            <SubmitButton pendingLabel="Saving…">
              Save &amp; regenerate barcodes
            </SubmitButton>
          </CardBody>
        </Card>
      </form>
    </section>
  );
}
