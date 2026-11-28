// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import type { FormDraft } from "@/lib/endatix-api/forms/types";
import fixture from "@/packages/survey-journal/__tests__/fixtures/title-and-rename.json";
import {
  DraftAutosave,
  type DraftQueue,
  type DraftView,
  type DraftWrite,
  type WriteResult,
} from "../controller";

const base: FormDraft = {
  version: "9007199254740993",
  contentHash: "original",
  jsonData: JSON.stringify(fixture.base),
  recordsSinceSnapshot: 199,
  hasUnpublishedChanges: false,
};
function editor(queue = DraftAutosave.empty(base)) {
  let disk = structuredClone(queue);
  const ports = {
    sessionId: "tab",
    online: vi.fn(() => true),
    load: vi.fn(),
    change: vi.fn<(view: DraftView) => void>(),
    persist: vi.fn(async (state: DraftQueue) => {
      disk = structuredClone(state);
    }),
    send: vi.fn<(request: DraftWrite) => Promise<WriteResult>>(),
  };
  const controller = new DraftAutosave(queue, ports);
  controller.open(base);
  return {
    controller,
    ports,
    stored: () => disk,
    status: () => ports.change.mock.lastCall?.[0].status,
  };
}

it("keeps unreplayable journal records and the complete local canvas after reopening", async () => {
  const original = editor();
  const terminal = JSON.stringify({ ...fixture.terminal, title: "Unrecorded" });
  original.controller.edit(terminal, fixture.records);
  await original.controller.flush();
  expect(original.ports.send).not.toHaveBeenCalled();
  expect(original.status()).toBe("recovery");
  await original.controller.close();

  const reopened = editor(original.stored());
  expect(reopened.status()).toBe("recovery");
  expect(reopened.stored().edits[0]).toMatchObject({
    jsonData: terminal,
    records: fixture.records,
  });
  reopened.ports.send.mockResolvedValue({
    kind: "saved",
    head: { ...base, jsonData: terminal },
  });
  await reopened.controller.resolve(true);
  expect(reopened.ports.send.mock.calls).toEqual([
    [{ version: base.version, jsonData: terminal }],
  ]);
  expect(reopened.stored().edits).toEqual([]);
});

it("rebuilds checkpoints against the cursor on an equal-hash 412", async () => {
  const { controller, ports } = editor();
  const remote = {
    ...base,
    version: "9007199254740994",
    recordsSinceSnapshot: 0,
  };
  ports.send
    .mockResolvedValueOnce({ kind: "stale", head: remote })
    .mockResolvedValueOnce({
      kind: "saved",
      head: { ...remote, jsonData: JSON.stringify(fixture.terminal) },
    });
  controller.edit(JSON.stringify(fixture.terminal), fixture.records);
  await controller.flush();
  const requests = ports.send.mock.calls.map(([request]) => request);
  expect(requests[0].batch?.checkpoints).toHaveLength(1);
  expect(requests[1]).toMatchObject({
    version: remote.version,
    batch: { checkpoints: [], records: fixture.records },
  });
});

it("stops on a changed document and replaces only when the editor chooses Keep mine", async () => {
  const { controller, ports, status } = editor();
  const remote = { ...base, version: "81", contentHash: "someone-else" };
  ports.send
    .mockResolvedValueOnce({ kind: "stale", head: remote })
    .mockResolvedValueOnce({ kind: "saved", head: remote });
  controller.edit(JSON.stringify(fixture.terminal), fixture.records);
  await controller.flush();
  expect(status()).toBe("conflict");
  await controller.resolve(true);
  expect(ports.send.mock.calls[1][0]).toEqual({
    version: "81",
    jsonData: JSON.stringify(fixture.terminal),
  });
});

it("resumes offline and expired-session saves in their original order", async () => {
  const { controller, ports, stored } = editor();
  ports.online.mockReturnValue(false);
  controller.edit('{"title":"one"}');
  await controller.flush();
  controller.edit('{"title":"two"}');
  await controller.flush();
  expect(ports.send).not.toHaveBeenCalled();
  ports.online.mockReturnValue(true);
  ports.send
    .mockResolvedValueOnce({ kind: "auth", message: "Sign in" })
    .mockResolvedValueOnce({
      kind: "saved",
      head: { ...base, version: "9007199254740994" },
    })
    .mockResolvedValueOnce({
      kind: "saved",
      head: { ...base, version: "9007199254740995" },
    });
  await controller.resume();
  expect(stored().edits).toHaveLength(2);
  await controller.resume();
  expect(ports.send.mock.calls.map(([r]) => [r.version, r.jsonData])).toEqual([
    [base.version, '{"title":"one"}'],
    [base.version, '{"title":"one"}'],
    ["9007199254740994", '{"title":"two"}'],
  ]);
});

it("never reapplies an uncertain save after a 401 and an equal-hash stale reply", async () => {
  const { controller, ports, status } = editor();
  controller.edit(base.jsonData, [
    { ...fixture.records[0], payload: { target: "/title", value: "" } },
  ]);
  ports.send
    .mockRejectedValueOnce(new Error("Response lost"))
    .mockResolvedValueOnce({ kind: "auth", message: "Sign in" })
    .mockResolvedValueOnce({
      kind: "stale",
      head: { ...base, version: "9007199254740996" },
    });
  await controller.flush();
  await controller.resume();
  await controller.resume();
  expect(status()).toBe("conflict");
  expect(ports.send.mock.calls.map(([request]) => request)).toEqual(
    Array(3).fill(ports.send.mock.calls[0][0]),
  );
});
