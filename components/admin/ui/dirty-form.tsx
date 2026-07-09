"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormHTMLAttributes,
  type ReactNode,
} from "react";

type DirtyContextValue = {
  dirty: boolean;
  markDirty: () => void;
};

const DirtyContext = createContext<DirtyContextValue>({
  dirty: false,
  markDirty: () => {},
});

/** Read whether the surrounding <DirtyForm> / <DirtyFormProvider> is dirty. */
export function useFormDirty() {
  return useContext(DirtyContext).dirty;
}

/**
 * Call when a control mutates the form WITHOUT firing a native input/change
 * event (e.g. a drag handle or reorder button that writes to a hidden input via
 * state). Native typing/checkbox/select/file edits are detected automatically.
 */
export function useMarkDirty() {
  return useContext(DirtyContext).markDirty;
}

/**
 * Shared dirty-tracking core. `matches` decides whether an input/change event
 * (from anywhere in the document) belongs to the tracked form — this is what
 * makes split layouts work (controls associated via the `form="<id>"`
 * attribute live outside the form's DOM subtree).
 */
function useDirtyTracker(matches: (target: Element) => boolean) {
  const [dirty, setDirty] = useState(false);
  const matchesRef = useRef(matches);

  useEffect(() => {
    matchesRef.current = matches;
  });

  const markDirty = useCallback(() => {
    setDirty((prev) => prev || true);
  }, []);

  useEffect(() => {
    function handle(event: Event) {
      const target = event.target as Element | null;
      if (target && matchesRef.current(target)) setDirty(true);
    }
    document.addEventListener("input", handle, true);
    document.addEventListener("change", handle, true);
    return () => {
      document.removeEventListener("input", handle, true);
      document.removeEventListener("change", handle, true);
    };
  }, []);

  return { dirty, markDirty };
}

/**
 * Drop-in replacement for <form> that tracks an "unsaved changes" (dirty) flag.
 * Use when the Save button lives INSIDE the form element. Wrap Save in
 * <ShowWhenDirty> so it only appears once the user changes something. The flag
 * resets on the next page load (server actions redirect after a successful save).
 */
export function DirtyForm({ children, ...props }: FormHTMLAttributes<HTMLFormElement>) {
  const formRef = useRef<HTMLFormElement>(null);
  const { dirty, markDirty } = useDirtyTracker((target) => {
    const form = formRef.current;
    if (!form) return false;
    const owner = (target as Element & { form?: HTMLFormElement | null }).form;
    return owner === form || form.contains(target);
  });

  return (
    <DirtyContext.Provider value={{ dirty, markDirty }}>
      <form ref={formRef} {...props}>
        {children}
      </form>
    </DirtyContext.Provider>
  );
}

/**
 * Provider-only variant for SPLIT layouts where the Save button (or toolbar)
 * sits OUTSIDE the <form> element and associates with it via `form="<formId>"`.
 * Wrap both the toolbar and the form in this, keep your own <form id={formId}>,
 * and wrap the Save button in <ShowWhenDirty>.
 */
export function DirtyFormProvider({
  formId,
  children,
}: {
  formId: string;
  children: ReactNode;
}) {
  const { dirty, markDirty } = useDirtyTracker((target) => {
    const owner = (target as Element & { form?: HTMLFormElement | null }).form;
    if (owner && owner.id === formId) return true;
    return target.closest?.(`form#${CSS.escape(formId)}`) != null;
  });

  return (
    <DirtyContext.Provider value={{ dirty, markDirty }}>
      {children}
    </DirtyContext.Provider>
  );
}

/** Renders its children only when the surrounding form is dirty. */
export function ShowWhenDirty({ children }: { children: ReactNode }) {
  const dirty = useFormDirty();
  if (!dirty) return null;
  return <>{children}</>;
}
