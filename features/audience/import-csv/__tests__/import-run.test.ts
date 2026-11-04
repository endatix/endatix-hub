import { describe, expect, it, vi } from "vitest";
import type { AudienceImportView } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import {
  canCancel,
  importChunk,
  isPolling,
  isTerminal,
  sameFileProblem,
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
    { status: "uploading", polls: false, cancels: true, ends: false },
    { status: "checking", polls: true, cancels: true, ends: false },
    { status: "checked", polls: false, cancels: true, ends: false },
    { status: "writing", polls: true, cancels: false, ends: false },
    { status: "completed", polls: false, cancels: false, ends: true },
    { status: "canceled", polls: false, cancels: false, ends: true },
    { status: "failed", polls: false, cancels: false, ends: true },
    { status: "expired", polls: false, cancels: false, ends: true },
    {
      status: "paused-by-a-newer-api",
      polls: false,
      cancels: false,
      ends: true,
    },
  ])("$status: polls $polls, cancels $cancels, terminal $ends", (row) => {
    // Act & Assert
    expect(isPolling(row.status)).toBe(row.polls);
    expect(canCancel(row.status)).toBe(row.cancels);
    expect(isTerminal(row.status)).toBe(row.ends);
  });
});

const failure = (statusCode?: number) =>
  Result.error<AudienceImportView>("It failed.", undefined, undefined, {
    statusCode,
  });

describe("uploadChunks", () => {
  it("sends the chunks one after another, reporting each, and returns the last view", async () => {
    // Arrange
    const sent: number[] = [];
    let inFlight = 0;
    const send = vi.fn(async (index: number) => {
      inFlight += 1;
      expect(inFlight).toBe(1);
      await Promise.resolve();
      inFlight -= 1;
      return Result.success(viewWith(index === 2 ? "checking" : "uploading"));
    });

    // Act
    const result = await uploadChunks({
      missing: [0, 1, 2],
      send,
      onSent: (index) => sent.push(index),
    });

    // Assert
    expect(sent).toEqual([0, 1, 2]);
    expect(Result.isSuccess(result) && result.value?.status).toBe("checking");
  });

  it.each([
    { what: "a thrown call", result: failure() },
    { what: "a 503", result: failure(503) },
  ])("retries $what once, then stops with its error", async ({ result }) => {
    // Arrange
    const send = vi.fn().mockResolvedValue(result);

    // Act
    const upload = await uploadChunks({
      missing: [0, 1],
      send,
      onSent: vi.fn(),
    });

    // Assert
    expect(send.mock.calls.map(([index]) => index)).toEqual([0, 0]);
    expect(Result.isError(upload) && upload.message).toBe("It failed.");
  });

  it("stops after the in-flight chunk when shouldContinue becomes false", async () => {
    // Arrange
    const sent: number[] = [];
    let allowMore = true;
    const send = vi.fn(async (index: number) => {
      if (index === 1) allowMore = false;
      return Result.success(viewWith("uploading"));
    });

    // Act
    const result = await uploadChunks({
      missing: [0, 1, 2],
      send,
      onSent: (index) => sent.push(index),
      shouldContinue: () => allowMore,
    });

    // Assert
    expect(sent).toEqual([0, 1]);
    expect(send).toHaveBeenCalledTimes(2);
    expect(Result.isSuccess(result)).toBe(true);
  });

  it("stops without a retry when the Hub refuses the chunk before sending it", async () => {
    // Arrange
    const send = vi
      .fn()
      .mockResolvedValue(
        Result.validationError<AudienceImportView>(
          "The chunk index is not valid.",
        ),
      );

    // Act
    const result = await uploadChunks({
      missing: [0, 1],
      send,
      onSent: vi.fn(),
    });

    // Assert
    expect(send).toHaveBeenCalledTimes(1);
    expect(Result.isError(result) && result.message).toBe(
      "The chunk index is not valid.",
    );
  });

  it.each([
    { what: "the import no longer takes rows (409)", statusCode: 409 },
    { what: "the chunk does not fit the import (400)", statusCode: 400 },
  ])("stops without a retry when $what", async ({ statusCode }) => {
    // Arrange
    const send = vi.fn().mockResolvedValue(failure(statusCode));

    // Act
    const result = await uploadChunks({
      missing: [0, 1, 2],
      send,
      onSent: vi.fn(),
    });

    // Assert
    expect(send).toHaveBeenCalledTimes(1);
    expect(Result.isError(result) && result.statusCode).toBe(statusCode);
  });
});

describe("sameFileProblem", () => {
  const file = {
    name: "panel.csv",
    headers: ["email"],
    rows: [{ cells: ["a"], malformed: false }],
  };
  const one = {
    ...viewWith("uploading"),
    upload: { rowCount: 1, chunkSize: 1_000, missingChunks: [0] },
  };

  it("treats an empty header row as unknown, as an import from the one-request route has", () => {
    // Act & Assert
    expect(sameFileProblem({ ...one, headers: [] }, file)).toBeNull();
    expect(sameFileProblem({ ...one, headers: ["id"] }, file)).toBe(
      "This file's columns differ from the import's. Choose panel.csv again.",
    );
  });

  it("names both row counts in words", () => {
    // Act & Assert
    expect(
      sameFileProblem(
        {
          ...viewWith("uploading"),
          upload: { rowCount: 1_300, chunkSize: 1_000, missingChunks: [] },
        },
        file,
      ),
    ).toBe(
      "This file has 1 row, but the import has 1,300 rows. Choose panel.csv again.",
    );
  });
});
