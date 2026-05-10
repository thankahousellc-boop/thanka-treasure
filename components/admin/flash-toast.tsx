"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

type FlashToastProps = {
  param?: string;
  messages: Record<string, string>;
};

export function FlashToast({ param = "status", messages }: FlashToastProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shown = useRef<string | null>(null);

  useEffect(() => {
    const value = searchParams.get(param);
    if (!value || shown.current === value) return;
    const message = messages[value];
    if (message) {
      toast.success(message);
      shown.current = value;
      const next = new URLSearchParams(searchParams);
      next.delete(param);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [param, messages, searchParams, router, pathname]);

  return null;
}
