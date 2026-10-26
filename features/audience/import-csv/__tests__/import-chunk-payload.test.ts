import { describe, expect, it } from "vitest";
import {
  chunkIndexProblem,
  chunkRowParts,
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

describe("chunkRowParts", () => {
  it("returns one part when the chunk already fits", () => {
    // Arrange
    const chunk = {
      index: 0,
      firstRowNumber: 2,
      rows: [{ cells: ["a@b.co"], malformed: false }],
    };

    // Act
    const parts = chunkRowParts(chunk, IMPORT_CHUNK_BODY_BYTES);

    // Assert
    expect(parts).toEqual([chunk.rows]);
  });

  it("splits rows when one chunk would exceed the byte limit", () => {
    // Arrange
    const cell = "x".repeat(8_000);
    const chunk = {
      index: 1,
      firstRowNumber: 4,
      rows: [
        { cells: [cell], malformed: false },
        { cells: [cell], malformed: false },
        { cells: [cell], malformed: false },
      ],
    };
    const maxBytes = importChunkJsonBytes({
      ...chunk,
      rows: chunk.rows.slice(0, 1),
    });

    // Act
    const parts = chunkRowParts(chunk, maxBytes);

    // Assert
    expect(parts).toHaveLength(3);
    expect(parts.flat()).toHaveLength(3);
    expect(
      parts.every(
        (rows) =>
          importChunkJsonBytes({ ...chunk, rows }) <= maxBytes,
      ),
    ).toBe(true);
  });
});
