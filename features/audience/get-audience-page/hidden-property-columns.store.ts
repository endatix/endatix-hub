import { z } from "zod";

/**
 * The Property columns a reader hid on a form's Participants list, by Property id, in this
 * browser. Hidden ids are stored rather than shown ones, so a new Property shows by default.
 * Storage that throws (blocked, private mode) reads as nothing hidden.
 */
const HiddenIdsSchema = z.array(z.string());

const EMPTY: readonly string[] = [];

const KEY_PREFIX = "ehx_participants_hidden_columns_";
const storageKey = (formId: string) => `${KEY_PREFIX}${formId}`;

/** Snapshots by key, so `useSyncExternalStore` sees the same array until it changes. */
const snapshots = new Map<
  string,
  { raw: string | null; ids: readonly string[] }
>();
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

function notify() {
  for (const listener of listeners) listener();
}

/** A choice made in another tab of this browser applies here too. */
function onStorage(event: StorageEvent) {
  if (event.key === null || event.key.startsWith(KEY_PREFIX)) notify();
}

export function subscribeHiddenPropertyColumns(listener: () => void) {
  if (listeners.size === 0) globalThis.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0)
      globalThis.removeEventListener("storage", onStorage);
  };
}

export function getHiddenPropertyColumns(formId: string): readonly string[] {
  const key = storageKey(formId);
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

/** False when storage refused the write; the caller keeps the choice for the visit. */
export function saveHiddenPropertyColumns(
  formId: string,
  ids: readonly string[],
): boolean {
  try {
    localStorage.setItem(storageKey(formId), JSON.stringify(ids));
  } catch {
    return false;
  }
  notify();
  return true;
}
