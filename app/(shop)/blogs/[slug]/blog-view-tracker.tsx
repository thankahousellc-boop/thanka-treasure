"use client";

import { useEffect } from "react";

type BlogViewTrackerProps = {
  postId: string;
};

export function BlogViewTracker({ postId }: BlogViewTrackerProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storageKey = `blog-view:${postId}`;
    try {
      if (window.sessionStorage.getItem(storageKey)) return;
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // sessionStorage can be unavailable (private mode, blocked storage).
      // Fall through and count the view anyway.
    }

    fetch("/api/blogs/views", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ postId }),
      keepalive: true,
    }).catch(() => {
      // Best-effort; do not surface errors to the reader.
    });
  }, [postId]);

  return null;
}
