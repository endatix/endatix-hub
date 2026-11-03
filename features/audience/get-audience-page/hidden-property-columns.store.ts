"use client";

import { z } from "zod";

/**
 * The Property columns a reader hid on a form's Participants list, by Property id, in this
 * browser. Hidden ids are stored rather than shown ones, so a new Property shows by default.
 * Storage that throws (blocked, private mode) reads as nothing hidden; a hide then lasts for the
 * visit only.
 */
const HiddenIdsSchema = z.array(z.string());

const EMPTY: readonly string[] = [];

const storageKey = (formId: string) =>
  `ehx_participants_hidden_columns_${formId}`;

/** Snapshots by key, so `useSyncExternalStore` sees the same array until it changes. */
const snapshots = new Map<
  string,
  { raw: string | null; ids: readonly string[] }
>();
/** Hides made while storage refused writes, kept for the visit. */
const unsaved = new Map<string, readonly string[]>();
const listeners = new Set<() => void>();

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parseIds(raw: string | null): readonly string[] {
  if (!raw) return EMPTY;
  try {
    const parsed = HiddenIdsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function subscribeHiddenPropertyColumns(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getHiddenPropertyColumns(formId: string): readonly string[] {
  const key = storageKey(formId);
  const kept = unsaved.get(key);
  if (kept) return kept;
  const raw = readStored(key);
  const cached = snapshots.get(key);
  if (cached?.raw === raw) return cached.ids;
  const ids = parseIds(raw);
  snapshots.set(key, { raw, ids });
  return ids;
}

export function getServerHiddenPropertyColumns(): readonly string[] {
  return EMPTY;
}

export function saveHiddenPropertyColumns(
  formId: string,
  ids: readonly string[],
) {
  const key = storageKey(formId);
  try {
    localStorage.setItem(key, JSON.stringify(ids));
    unsaved.delete(key);
  } catch {
    unsaved.set(key, ids);
  }
  for (const listener of listeners) listener();
}
