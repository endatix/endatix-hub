import { describe, expect, it } from "vitest";
import {
  isPdfRenderTimeout,
  raceWithTimeout,
  remainingDeadlineMs,
  RENDER_DEADLINE_MS,
} from "../render-deadline";

describe("render-deadline", () => {
  it("fails immediately when no budget remains", async () => {
    // Arrange & Act
    const work = Promise.resolve("ok");

    // Assert
    await expect(raceWithTimeout(work, 0)).rejects.toThrow(
      "pdf_render_timeout",
    );
  });

  it("resolves when work finishes inside the budget", async () => {
    // Arrange & Act
    const result = await raceWithTimeout(Promise.resolve("ok"), 1_000);

    // Assert
    expect(result).toBe("ok");
  });

  it("classifies timeout errors", () => {
    // Arrange & Act & Assert
    expect(isPdfRenderTimeout(new Error("pdf_render_timeout"))).toBe(true);
    expect(isPdfRenderTimeout(new Error("other"))).toBe(false);
  });

  it("computes remaining budget from start time", () => {
    // Arrange & Act
    const remaining = remainingDeadlineMs(Date.now());

    // Assert
    expect(remaining).toBeLessThanOrEqual(RENDER_DEADLINE_MS);
    expect(remaining).toBeGreaterThan(RENDER_DEADLINE_MS - 50);
  });
});
