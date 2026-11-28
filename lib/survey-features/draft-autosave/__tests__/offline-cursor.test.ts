import { expect, it, vi } from "vitest";
import { DraftAutosave } from "../controller";
import { queueEdit } from "../queue-edit";

const base = { version: "0", jsonData: "{}", contentHash: "base", hasUnpublishedChanges: false, recordsSinceSnapshot: 0 };

it("encodes at most one document per journal burst, independent of the offline backlog", () => {
  const encode = vi.spyOn(TextEncoder.prototype, "encode");
  let queue = DraftAutosave.empty(base);
  for (let i = 0; i < 401; i++) {
    queue = queueEdit(queue, JSON.stringify({ i }), [{ seq: 1 }]);
    queue = { ...queue, sealed: queue.next - 1 };
  }
  expect(queue.edits[199].groups).toHaveLength(1);
  expect(queue.edits[399].groups).toHaveLength(1);
  expect(encode.mock.calls.length).toBeLessThanOrEqual(401);
});

it("recomputes a projected boundary once when the acknowledged base cursor changes", () => {
  let queue = queueEdit(DraftAutosave.empty(base), '{"i":1}', [{ seq: 1 }]);
  queue = { ...queue, sealed: 1, base: { ...base, version: "505", recordsSinceSnapshot: 198 } };
  const next = queueEdit(queue, '{"i":2}', [{ seq: 1 }]);
  expect(next.edits[1].groups).toEqual([{ start: 0, end: 1, before: '{"i":1}', after: '{"i":2}' }]);
});
