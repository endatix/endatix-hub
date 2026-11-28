import { createStore, del, get, keys, set } from "idb-keyval";
import type { DraftQueue } from "./controller";
import type { FormDraft } from "@/lib/endatix-api/forms/types";

const store = createStore("form-editor-drafts", "queues");

export function keepLegacyEdit(scope: string, sessionId: string, jsonData: string) {
  return set(`draft:${scope}:${sessionId}`, { legacyDocument: jsonData }, store);
}

async function readQueue(key: string, head: FormDraft) {
  const saved = await get<DraftQueue | { legacyDocument: string }>(key, store);
  if (!saved || !("legacyDocument" in saved)) return saved;
  // A pre-cutover edit has no draft version. Only an explicit restore may replace the new draft.
  return { base: head, recovery: true, next: 2, sealed: 1, edits: [{ saveNo: 1, jsonData: saved.legacyDocument, records: [] }] };
}

/** Each active editor owns a separate queue, including tabs opened by duplicating a tab. */
async function claim(key: string) {
  let release!: () => void;
  const held = new Promise<void>((done) => {
    release = done;
  });
  return new Promise<(() => void) | undefined>((resolve, reject) => {
    void navigator.locks
      .request(key, { ifAvailable: true }, (lock) => {
        resolve(lock ? release : undefined);
        return lock ? held : undefined;
      })
      .catch(reject);
  });
}

async function availableQueue(prefix: string, signal: AbortSignal) {
  const candidates = (await keys<string>(store)).filter((key) =>
    key.startsWith(prefix),
  );
  candidates.push(prefix + crypto.randomUUID());
  for (const key of candidates) {
    // A discarded React mount must never take the recoverable queue from its replacement.
    signal.throwIfAborted();
    const release = await claim(key);
    if (release) return {key, release, sessionId: key.slice(prefix.length)};
  }
  throw new Error("Could not open the local draft.");
}

export async function openDraftStore(scope: string, head: FormDraft, signal: AbortSignal) {
  const lease = await availableQueue(`draft:${scope}:`, signal);
  try {
    signal.throwIfAborted();
    const queue = await readQueue(lease.key, head);
    const persist = (state: DraftQueue) => state.edits.length ? set(lease.key, state, store) : del(lease.key, store);
    return { ...lease, queue, persist };
  } catch (error) {
    lease.release();
    throw error;
  }
}
