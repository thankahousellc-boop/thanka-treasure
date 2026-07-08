"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

import { Icon } from "@/components/admin/ui";

import { deleteAttributeAction } from "./actions";

const actionButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--admin-accent) focus-visible:ring-offset-(--admin-bg)";

function DeleteAttributeButton({ name }: { name: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      aria-label={`Delete ${name}`}
      title={`Delete ${name}`}
      className={`${actionButtonClass} border-transparent text-(--admin-text-mute) hover:border-(--admin-danger) hover:bg-(--admin-danger)/10 hover:text-(--admin-danger) disabled:cursor-not-allowed disabled:opacity-50`}
      onClick={(event) => {
        if (
          !window.confirm(
            `Delete "${name}"? This removes it from the product form and storefront facets. This cannot be undone.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      {pending ? (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : (
        <Icon.Trash width={15} height={15} />
      )}
    </button>
  );
}

export function AttributeRowActions({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Link
        href={`/admin/products/attributes/${id}`}
        aria-label={`Edit ${name}`}
        title={`Edit ${name}`}
        className={`${actionButtonClass} border-(--admin-border) text-(--admin-text-soft) hover:border-(--admin-border-strong) hover:bg-(--admin-surface-2) hover:text-(--admin-text)`}
      >
        <Icon.Pencil width={15} height={15} />
      </Link>
      <form action={deleteAttributeAction}>
        <input type="hidden" name="id" value={id} />
        <DeleteAttributeButton name={name} />
      </form>
    </div>
  );
}
