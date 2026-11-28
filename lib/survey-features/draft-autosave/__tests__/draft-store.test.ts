import { beforeEach, expect, it, vi } from "vitest";
import { keepLegacyEdit, openDraftStore } from "../idb-draft-store";
import { DraftAutosave } from "../controller";

const data = vi.hoisted(() => new Map<string, unknown>());
vi.mock("idb-keyval", () => ({
  createStore: () => ({}),
  set: async (key: string, value: unknown) => data.set(key, structuredClone(value)),
  del: async (key: string) => data.delete(key),
  keys: async () => [...data.keys()],
  get: async (key: string) => structuredClone(data.get(key)),
}));
const head = { version: "7", recordsSinceSnapshot: 0, contentHash: "head", jsonData: "{}", hasUnpublishedChanges: false };
const scope = JSON.stringify(["tenant", "user", "form"]);
const open = (key = scope) => openDraftStore(key, head, new AbortController().signal);

beforeEach(() => {
  data.clear();
  const held = new Set<string>();
  vi.stubGlobal("navigator", { locks: {
    async request(key: string, _: unknown, callback: (lock: object | null) => Promise<void>) {
      if (held.has(key)) return callback(null);
      held.add(key);
      try { await callback({}); } finally { held.delete(key); }
    },
  } });
});

it("restores a stale legacy save only for its own identity and leaves a concurrent tab's queue alone", async () => {
  await keepLegacyEdit(scope, "legacy-tab", '{"title":"Unsynced"}');
  const other = await open(JSON.stringify(["tenant", "another user", "form"]));
  expect(other.queue).toBeUndefined();
  const first = await open();
  expect(first.sessionId).toBe("legacy-tab");
  expect(first.queue).toMatchObject({ base: head, recovery: true, edits: [{ jsonData: '{"title":"Unsynced"}' }] });
  const second = await open();
  expect(second.sessionId).not.toBe(first.sessionId);
  expect(second.queue).toBeUndefined();
  await first.persist(first.queue!);
  first.release();
  const reopened = await open();
  expect(reopened.queue).toEqual(first.queue);
  await reopened.persist(DraftAutosave.empty(head));
  expect(data.size).toBe(0);
  other.release();
  second.release();
  reopened.release();
});

it("never claims or discards interrupted work for a cancelled mount", async () => {
  await keepLegacyEdit(scope, "old", '{"title":"Interrupted"}');
  await expect(openDraftStore(scope, head, AbortSignal.abort())).rejects.toThrow();
  const active = await open();
  expect(active.sessionId).toBe("old");
  active.release();
});
