import { createStore, del, get, keys, set } from "idb-keyval";
import type { DraftQueue } from "./controller";

const store = createStore("form-editor-drafts", "queues");

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

export async function openDraftStore(scope: string, signal: AbortSignal) {
  const prefix = `draft:${scope}:`;
  const candidates = (await keys<string>(store)).filter((key) =>
    key.startsWith(prefix),
  );
  candidates.push(prefix + crypto.randomUUID());
  for (const key of candidates) {
    // A discarded React mount must never take the recoverable queue from its replacement.
    signal.throwIfAborted();
    const release = await claim(key);
    if (!release) continue;
    try {
      signal.throwIfAborted();
      const queue = await get<DraftQueue>(key, store);
      const persist = (state: DraftQueue) =>
        state.edits.length ? set(key, state, store) : del(key, store);
      return { queue, sessionId: key.slice(prefix.length), persist, release };
    } catch (error) {
      release();
      throw error;
    }
  }
  throw new Error("Could not open the local draft.");
}
