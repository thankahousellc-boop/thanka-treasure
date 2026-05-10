"use client";

import { Button, Icon } from "@/components/admin/ui";

type Props = {
  csv: string;
  filename?: string;
};

export function DownloadTemplateButton({
  csv,
  filename = "products-import-template.csv",
}: Props) {
  function handleDownload() {
    const blob = new Blob(["﻿", csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="md"
      onClick={handleDownload}
    >
      <Icon.Download width={14} height={14} />
      <span>Download template</span>
    </Button>
  );
}
