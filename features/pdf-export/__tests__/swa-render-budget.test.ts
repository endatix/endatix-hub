import { describe, expect, it } from "vitest";
import {
  isPdfRenderTimeout,
  raceWithTimeout,
  remainingSwaBudgetMs,
  SWA_SSR_BUDGET_MS,
} from "../swa-render-budget";

describe("swa-render-budget", () => {
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
    const remaining = remainingSwaBudgetMs(Date.now());

    // Assert
    expect(remaining).toBeLessThanOrEqual(SWA_SSR_BUDGET_MS);
    expect(remaining).toBeGreaterThan(SWA_SSR_BUDGET_MS - 50);
  });
});
