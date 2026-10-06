"use client";

import { useState } from "react";
import type { AudiencePropertyValues } from "@/lib/endatix-api/audience/types";

/**
 * Open state for a create panel: opening resets the form, and the panel cannot be closed while
 * its own write runs (DESIGN.md §5 Overlays rule 8).
 */
export function usePanelOpen(reset: () => void, pending: boolean) {
  const [open, setOpen] = useState(false);
  const openChange = (next: boolean) => {
    if (pending) return;
    if (next) reset();
    setOpen(next);
  };
  return { open, openChange, close: () => setOpen(false) };
}

/** Property values being edited, keyed by property id. */
export function useValueMap(initial: AudiencePropertyValues = {}) {
  const [values, setValues] = useState<AudiencePropertyValues>(initial);
  const setValue = (propertyId: string, value: string) =>
    setValues((current) => ({ ...current, [propertyId]: value }));
  return { values, setValue, reset: () => setValues({}) };
}

/** The row a list's edit overlay or delete confirmation is open for; one at a time. */
export function useRowOverlay<T>() {
  const [editing, setEditing] = useState<T | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);
  const close = () => {
    setEditing(null);
    setDeleting(null);
  };
  return { editing, deleting, edit: setEditing, remove: setDeleting, close };
}
