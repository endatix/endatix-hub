import { describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import {
  NAME_CHECK_FAILED,
  NAME_CHECK_LIMIT,
  checkNamesInChunks,
} from "../check-names";

describe("checkNamesInChunks", () => {
  it("asks for every name, 500 at a time, and keeps each answer", async () => {
    // Arrange
    const names = Array.from({ length: NAME_CHECK_LIMIT + 1 }, (_, i) => `n${i}`);
    const check = vi.fn(async (chunk: string[]) =>
      Result.success(chunk.map((variable) => ({ variable }))),
    );

    // Act
    const result = await checkNamesInChunks(names, check);

    // Assert
    expect(check.mock.calls.map(([chunk]) => chunk.length)).toEqual([
      NAME_CHECK_LIMIT,
      1,
    ]);
    expect(Result.isSuccess(result) && result.value).toHaveLength(names.length);
  });

  it("fails the whole check when a chunk fails, so nothing is treated as clear", async () => {
    // Arrange
    const names = Array.from({ length: NAME_CHECK_LIMIT + 1 }, (_, i) => `n${i}`);
    const check = vi
      .fn<(chunk: string[]) => Promise<Result<{ variable: string }[]>>>()
      .mockResolvedValueOnce(Result.success([{ variable: "n0" }]))
      .mockResolvedValueOnce(Result.error("The form could not be read."));

    // Act
    const result = await checkNamesInChunks(names, check);

    // Assert
    expect(Result.isError(result) && result.message).toBe(
      "The form could not be read.",
    );
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("fails the whole check when a chunk rejects", async () => {
    // Arrange
    const check = vi.fn(async () => {
      throw new Error("network");
    });

    // Act
    const result = await checkNamesInChunks(["segment"], check);

    // Assert
    expect(Result.isError(result) && result.message).toBe(NAME_CHECK_FAILED);
  });
});
