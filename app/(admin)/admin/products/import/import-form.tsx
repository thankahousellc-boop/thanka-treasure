"use client";

import { useActionState, useRef, useState } from "react";

import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  Field,
  Icon,
} from "@/components/admin/ui";

import { bulkImportProductsAction, type ImportResult } from "./actions";

const initialState: ImportResult | null = null;

async function runImport(
  _previous: ImportResult | null,
  formData: FormData,
): Promise<ImportResult | null> {
  return bulkImportProductsAction(formData);
}

export function ImportForm() {
  const [result, formAction, isPending] = useActionState(
    runImport,
    initialState,
  );
  const [csvName, setCsvName] = useState<string | null>(null);
  const [imageNames, setImageNames] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Upload CSV"
          description="Each row creates one product variant. Rows that share a slug are merged into a single product with multiple variants."
        />
        <CardBody>
          <form ref={formRef} action={formAction} className="space-y-4">
            <Field
              label="CSV file"
              hint={csvName ? `Ready: ${csvName}` : "Required. Max 2MB, 1000 rows."}
            >
              <input
                type="file"
                name="csv"
                accept=".csv,text/csv"
                required
                onChange={(event) =>
                  setCsvName(event.target.files?.[0]?.name ?? null)
                }
                className="block w-full rounded-md px-2 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-(--admin-accent) file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:brightness-110"
                style={{
                  background: "var(--admin-surface)",
                  border: "1px solid var(--admin-border-strong)",
                  color: "var(--admin-text)",
                }}
              />
            </Field>

            <Field
              label="Image files (optional)"
              hint={
                imageNames.length > 0
                  ? `${imageNames.length} image${imageNames.length === 1 ? "" : "s"} ready: ${imageNames
                      .slice(0, 5)
                      .join(", ")}${imageNames.length > 5 ? `, +${imageNames.length - 5} more` : ""}`
                  : "Match the filenames you reference in the CSV's images column. JPEG/PNG/WEBP, ≤5MB each."
              }
            >
              <input
                type="file"
                name="images"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) =>
                  setImageNames(
                    Array.from(event.target.files ?? []).map((f) => f.name),
                  )
                }
                className="block w-full rounded-md px-2 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-(--admin-accent) file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:brightness-110"
                style={{
                  background: "var(--admin-surface)",
                  border: "1px solid var(--admin-border-strong)",
                  color: "var(--admin-text)",
                }}
              />
            </Field>

            <div className="flex items-center justify-end gap-2">
              <ButtonLink
                href="/admin/products"
                variant="secondary"
                size="md"
              >
                Cancel
              </ButtonLink>
              <Button type="submit" variant="primary" size="md" disabled={isPending}>
                <Icon.Upload width={14} height={14} />
                <span>{isPending ? "Importing…" : "Run import"}</span>
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {result ? <ResultPanel result={result} /> : null}
    </div>
  );
}

function ResultPanel({ result }: { result: ImportResult }) {
  if (result.fatalError) {
    return (
      <Card>
        <CardHeader title="Import failed" />
        <CardBody>
          <p className="text-sm" style={{ color: "#b3261e" }}>
            {result.fatalError}
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Import report"
        description={`${result.totalRows} row${result.totalRows === 1 ? "" : "s"} → ${result.productGroups} product group${result.productGroups === 1 ? "" : "s"}`}
      />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone="success">{result.created} created</Badge>
          {result.skipped > 0 ? (
            <Badge tone="warning">{result.skipped} skipped</Badge>
          ) : null}
          {result.failed > 0 ? (
            <Badge tone="danger">{result.failed} failed</Badge>
          ) : null}
        </div>

        {result.reports.length > 0 ? (
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
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {result.reports.map((report) => (
                  <tr
                    key={`${report.rowNumber}-${report.slug}`}
                    style={{ borderTop: "1px solid var(--admin-border)" }}
                  >
                    <td className="px-3 py-2 align-top text-xs">
                      {report.rowNumber}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <p className="font-medium">{report.title}</p>
                      {report.slug ? (
                        <p
                          className="text-[11px]"
                          style={{ color: "var(--admin-text-mute)" }}
                        >
                          /{report.slug}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Badge
                        tone={
                          report.status === "created"
                            ? "success"
                            : report.status === "skipped"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {report.status}
                      </Badge>
                    </td>
                    <td
                      className="px-3 py-2 align-top text-xs"
                      style={{ color: "var(--admin-text-soft)" }}
                    >
                      <p>{report.message}</p>
                      {report.imagesUploaded > 0 ? (
                        <p
                          className="mt-1"
                          style={{ color: "var(--admin-text-mute)" }}
                        >
                          {report.imagesUploaded} image
                          {report.imagesUploaded === 1 ? "" : "s"} uploaded.
                        </p>
                      ) : null}
                      {report.imagesFailed.length > 0 ? (
                        <ul className="mt-1 list-disc space-y-0.5 pl-4" style={{ color: "#b3261e" }}>
                          {report.imagesFailed.map((entry) => (
                            <li key={entry}>{entry}</li>
                          ))}
                        </ul>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
