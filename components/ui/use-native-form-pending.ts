"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Pending state for a control inside a native form that navigates the browser
 * (`<form method="get">` with no server action).
 *
 * `useFormStatus` only tracks server actions, so those forms need their own
 * source of truth: the form's submit event marks the start, and the navigation
 * that follows replaces the page.
 *
 * `pageshow` clears it because a bfcache restore hands back the *same* DOM
 * rather than a fresh render — without this, hitting Back leaves the control
 * permanently disabled.
 */
export function useNativeFormPending<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;

    const handleSubmit = () => setPending(true);
    const handlePageShow = () => setPending(false);

    form.addEventListener("submit", handleSubmit);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      form.removeEventListener("submit", handleSubmit);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return { ref, pending };
}
