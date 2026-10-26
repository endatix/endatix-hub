import { describe, expect, it } from "vitest";
import {
  chunkIndexProblem,
  firstOversizedChunk,
  IMPORT_CHUNK_BODY_BYTES,
  importChunkJsonBytes,
} from "../import-chunk-payload";

describe("chunkIndexProblem", () => {
  it("rejects a non-integer index", () => {
    // Act & Assert
    expect(chunkIndexProblem(1.5)).toBe("The chunk index is not valid.");
    expect(chunkIndexProblem(-1)).toBe("The chunk index is not valid.");
  });
});

describe("firstOversizedChunk", () => {
  const row = (cell: string) => ({ cells: ["a@b.co", cell], malformed: false });

  it("finds no chunk over the limit in an ordinary file", () => {
    // Act & Assert
    expect(
      firstOversizedChunk(
        [row("40"), row("41")],
        { chunkSize: 1_000, columns: 2 },
        IMPORT_CHUNK_BODY_BYTES,
      ),
    ).toBeNull();
  });

  it("names the first chunk whose rows are too long to send in one request", () => {
    // Arrange
    const rows = [row("40"), row("41"), row("x".repeat(500)), row("43")];
    const place = { chunkSize: 2, columns: 2 };
    const limit =
      importChunkJsonBytes({
        index: 0,
        firstRowNumber: 2,
        rows: rows.slice(0, 2),
      }) + 10;

    // Act
    const oversized = firstOversizedChunk(rows, place, limit);

    // Assert
    expect(oversized).toEqual({ firstRowNumber: 4, lastRowNumber: 5 });
  });
});
