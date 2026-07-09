"use client";

import { Button } from "@/components/admin/ui";

export function PrintButton() {
  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
      Print label
    </Button>
  );
}
