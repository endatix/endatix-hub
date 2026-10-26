import { describe, expect, it, vi } from "vitest";
import type { AudienceImportView } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import {
  canCancel,
  importChunk,
  isPolling,
  isTerminal,
  uploadChunks,
} from "../import-run";

function viewWith(status: string): AudienceImportView {
  return {
    importId: "9",
    status,
    fileName: "panel.csv",
    isTest: false,
    upload: { rowCount: 5, chunkSize: 2, missingChunks: [] },
    runsInBackground: true,
    checkedRowCount: 0,
    check: null,
    written: {
      writtenRowCount: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      rejectedCount: 0,
    },
    rejections: [],
    failure: null,
    canResume: false,
    createdAt: "2026-10-26T10:00:00Z",
    finishedAt: null,
  };
}

const row = (cells: string[], malformed = false) => ({ cells, malformed });

describe("importChunk", () => {
  it("takes the chunk's rows, numbered from the spreadsheet row after the header", () => {
    // Arrange
    const rows = [row(["a"]), row(["b"]), row(["c"]), row(["d"]), row(["e"])];

    // Act
    const chunk = importChunk(rows, { index: 1, chunkSize: 2, columns: 1 });

    // Assert
    expect(chunk).toEqual({
      firstRowNumber: 4,
      rows: [row(["c"]), row(["d"])],
    });
  });

  it("trims cells, drops cells past the header and keeps the malformed mark", () => {
    // Arrange
    const rows = [row([" ana@acme.co ", "40", "extra"], true)];

    // Act
    const chunk = importChunk(rows, { index: 0, chunkSize: 1_000, columns: 2 });

    // Assert
    expect(chunk).toEqual({
      firstRowNumber: 2,
      rows: [row(["ana@acme.co", "40"], true)],
    });
  });
});

describe("import status", () => {
  it.each([
    ["uploading", false, true, false],
    ["checking", true, true, false],
    ["checked", false, true, false],
    ["writing", true, false, false],
    ["completed", false, false, true],
    ["canceled", false, false, true],
    ["failed", false, false, true],
    ["expired", false, false, true],
    ["paused-by-a-newer-api", false, false, true],
  ])("%s: polls %s, cancels %s, terminal %s", (status, polls, cancels, ends) => {
    // Act & Assert
    expect(isPolling(status)).toBe(polls);
    expect(canCancel(status)).toBe(cancels);
    expect(isTerminal(status)).toBe(ends);
  });
});

/** A sender whose chunks settle when the test says so, recording how many were in flight. */
function controlledSender() {
  const pending = new Map<number, (result: Result<AudienceImportView>) => void>();
  let inFlight = 0;
  let maxInFlight = 0;
  const send = vi.fn(
    (index: number) =>
      new Promise<Result<AudienceImportView>>((resolve) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        pending.set(index, (result) => {
          inFlight -= 1;
          pending.delete(index);
          resolve(result);
        });
      }),
  );
  const settle = async (index: number, result: Result<AudienceImportView>) => {
    pending.get(index)?.(result);
    await vi.waitFor(() => undefined);
  };
  return { send, settle, pending, maxInFlight: () => maxInFlight };
}

describe("uploadChunks", () => {
  it("keeps three chunks in flight, reports rows sent, and returns the view that left uploading", async () => {
    // Arrange
    const sender = controlledSender();
    const onSent = vi.fn();
    const upload = uploadChunks({
      missing: [0, 1, 2, 3, 4],
      send: sender.send,
      onSent,
    });

    // Act
    await vi.waitFor(() => expect(sender.pending.size).toBe(3));
    for (const index of [0, 1, 2, 3]) {
      await sender.settle(index, Result.success(viewWith("uploading")));
    }
    await vi.waitFor(() => expect(sender.pending.has(4)).toBe(true));
    await sender.settle(4, Result.success(viewWith("checking")));
    const result = await upload;

    // Assert
    expect(sender.maxInFlight()).toBe(3);
    expect(onSent.mock.calls.map(([index]) => index)).toEqual([0, 1, 2, 3, 4]);
    expect(Result.isSuccess(result) && result.value?.status).toBe("checking");
  });

  it("retries a failed chunk once, then stops with its error", async () => {
    // Arrange
    const send = vi
      .fn()
      .mockResolvedValue(Result.error<AudienceImportView>("The network is down."));

    // Act
    const result = await uploadChunks({ missing: [0], send, onSent: vi.fn() });

    // Assert
    expect(send).toHaveBeenCalledTimes(2);
    expect(Result.isError(result) && result.message).toBe("The network is down.");
  });

  it("stops at once when the import no longer takes rows (409)", async () => {
    // Arrange
    const conflict = Result.error<AudienceImportView>(
      "The import is canceled; it takes no more rows.",
      undefined,
      undefined,
      { statusCode: 409 },
    );
    const send = vi.fn().mockResolvedValue(conflict);

    // Act
    const result = await uploadChunks({
      missing: [0, 1, 2, 3, 4, 5],
      send,
      onSent: vi.fn(),
    });

    // Assert
    expect(send).toHaveBeenCalledTimes(3);
    expect(Result.isError(result) && result.statusCode).toBe(409);
  });
});
