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

type RowOverlayMode = "edit" | "delete";

/**
 * The row a list's edit overlay or delete confirmation is for; one at a time. Closing keeps the
 * row, so the overlay keeps its content while it animates out. `session` changes on every open,
 * so a panel keyed by it starts fresh even when the same row is opened again.
 */
export function useRowOverlay<T>() {
  const [target, setTarget] = useState<T | null>(null);
  const [mode, setMode] = useState<RowOverlayMode | null>(null);
  const [session, setSession] = useState(0);
  const open = (next: RowOverlayMode) => (row: T) => {
    setTarget(row);
    setMode(next);
    setSession((count) => count + 1);
  };
  return {
    target,
    session,
    isEditing: mode === "edit",
    isDeleting: mode === "delete",
    edit: open("edit"),
    remove: open("delete"),
    close: () => setMode(null),
  };
}
