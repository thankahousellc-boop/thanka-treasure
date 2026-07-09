"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Modal is only ever rendered in response to a client click, so it never runs
// during SSR — safe to portal straight to document.body.

import { Button, ButtonLink, Field, Input, Icon, SubmitButton } from "@/components/admin/ui";

import { bulkImportReviews, createReview } from "./actions";
import { ReviewFields } from "./review-fields";

function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="admin-app fixed inset-0 z-100 flex items-start justify-center overflow-y-auto p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />
      <div
        className="relative z-10 my-auto w-full max-w-xl rounded-lg shadow-2xl"
        style={{
          background: "var(--admin-bg)",
          border: "1px solid var(--admin-border)",
        }}
      >
        <div
          className="flex items-start gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid var(--admin-border)" }}
        >
          <div className="min-w-0 flex-1">
            <h3
              className="font-semibold"
              style={{ color: "var(--admin-text)" }}
            >
              {title}
            </h3>
            {description ? (
              <p
                className="mt-0.5 text-[12px]"
                style={{ color: "var(--admin-text-mute)" }}
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md transition hover:bg-(--admin-accent-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--admin-accent)"
            style={{ color: "var(--admin-text-soft)" }}
          >
            <Icon.Close width={16} height={16} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ReviewActions() {
  const [open, setOpen] = useState<null | "add" | "bulk">(null);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" size="md" onClick={() => setOpen("add")}>
          <Icon.Plus width={14} height={14} />
          <span>Add review</span>
        </Button>
        <Button variant="secondary" size="md" onClick={() => setOpen("bulk")}>
          <Icon.Upload width={14} height={14} />
          <span>Bulk import</span>
        </Button>
      </div>

      {open === "add" ? (
        <Modal
          title="Add review"
          description="Copy a review from Etsy and paste it here."
          onClose={() => setOpen(null)}
        >
          <form action={createReview} className="space-y-4">
            <ReviewFields />
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setOpen(null)}
              >
                Cancel
              </Button>
              <SubmitButton pendingLabel="Adding…">
                <Icon.Plus width={14} height={14} />
                <span>Add review</span>
              </SubmitButton>
            </div>
          </form>
        </Modal>
      ) : null}

      {open === "bulk" ? (
        <Modal
          title="Bulk import (CSV)"
          description="Upload a CSV to add many reviews at once."
          onClose={() => setOpen(null)}
        >
          <form action={bulkImportReviews} className="space-y-4">
            <div
              className="rounded-md px-3 py-2 text-[12px] leading-relaxed"
              style={{
                background: "var(--admin-surface)",
                border: "1px solid var(--admin-border)",
                color: "var(--admin-text-mute)",
              }}
            >
              Columns (any order):{" "}
              <span style={{ color: "var(--admin-text-soft)" }}>
                authorName, rating, body, productTitle, reviewedAt
              </span>
              . Only <strong>authorName</strong> and <strong>body</strong> are
              required. Date format: YYYY-MM-DD. All rows import as published.
            </div>
            <Field label="CSV file">
              <Input type="file" name="file" accept=".csv,text/csv" required />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ButtonLink
                href="/reviews-sample.csv"
                download="reviews-sample.csv"
                variant="ghost"
                size="md"
              >
                <Icon.Download width={14} height={14} />
                <span>Download sample</span>
              </ButtonLink>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setOpen(null)}
                >
                  Cancel
                </Button>
                <SubmitButton pendingLabel="Importing…">
                  <Icon.Upload width={14} height={14} />
                  <span>Import CSV</span>
                </SubmitButton>
              </div>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
