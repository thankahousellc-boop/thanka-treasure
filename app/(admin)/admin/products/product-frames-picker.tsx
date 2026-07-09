"use client";

import Image from "next/image";
import { useState } from "react";

import { Card, CardBody, CardHeader, EmptyState } from "@/components/admin/ui";
import { resolveUrl } from "@/lib/storage/resolve-url";
import { formatCurrency } from "@/lib/utils/formatters";

export type AvailableFrame = {
  id: string;
  name: string;
  priceDelta: number;
  imageBucket: string | null;
  imagePath: string | null;
};

type ProductFramesPickerProps = {
  availableFrames: AvailableFrame[];
  initialSelectedIds: string[];
  initialDefaultId: string | null;
  formId?: string;
};

export function ProductFramesPicker({
  availableFrames,
  initialSelectedIds,
  initialDefaultId,
  formId,
}: ProductFramesPickerProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [defaultId, setDefaultId] = useState<string | null>(
    initialDefaultId && initialSelectedIds.includes(initialDefaultId)
      ? initialDefaultId
      : initialSelectedIds[0] ?? null,
  );

  function toggle(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        const next = current.filter((value) => value !== id);
        if (defaultId === id) {
          setDefaultId(next[0] ?? null);
        }
        return next;
      }
      const next = [...current, id];
      if (defaultId === null) setDefaultId(id);
      return next;
    });
  }

  if (availableFrames.length === 0) {
    return (
      <Card>
        <CardHeader title="Frames" description="Frames offered with this product." />
        <CardBody>
          <EmptyState
            title="No frames available."
            description="Add frames in the Frames section, then come back to assign them."
          />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Frames"
        description="Pick which frames the customer can choose between on the product page. Set one as default."
      />
      <CardBody className="space-y-2">
        <ul className="grid gap-2 sm:grid-cols-2">
          {availableFrames.map((frame) => {
            const url =
              frame.imageBucket && frame.imagePath
                ? resolveUrl({ bucket: frame.imageBucket, path: frame.imagePath })
                : null;
            const isSelected = selectedIds.includes(frame.id);
            const isDefault = defaultId === frame.id;
            return (
              <li key={frame.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition ${
                    isSelected
                      ? "border-(--admin-accent) bg-(--admin-accent-soft)"
                      : "border-(--admin-border) hover:border-(--admin-border-strong)"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="frameId"
                    form={formId}
                    value={frame.id}
                    checked={isSelected}
                    onChange={() => toggle(frame.id)}
                    className="h-4 w-4 rounded border-(--admin-border-strong) accent-(--admin-accent) focus:ring-(--admin-accent)"
                  />
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded border border-(--admin-border) bg-(--admin-surface-2)">
                    {url ? (
                      <Image
                        src={url}
                        alt={frame.name}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-(--admin-text)">
                      {frame.name}
                    </p>
                    <p className="text-xs text-(--admin-text-mute)">
                      {frame.priceDelta > 0
                        ? `+${formatCurrency(frame.priceDelta)}`
                        : "Included"}
                    </p>
                  </div>
                  <label
                    className={`flex items-center gap-1.5 text-[11px] font-medium ${
                      isSelected ? "text-(--admin-text-soft)" : "text-(--admin-text-mute)"
                    }`}
                  >
                    <input
                      type="radio"
                      name="defaultFrameId"
                      form={formId}
                      value={frame.id}
                      checked={isDefault}
                      onChange={() => setDefaultId(frame.id)}
                      disabled={!isSelected}
                      className="h-3.5 w-3.5 border-(--admin-border-strong) accent-(--admin-accent) focus:ring-(--admin-accent)"
                    />
                    Default
                  </label>
                </label>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
