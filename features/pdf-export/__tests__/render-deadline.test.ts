import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_RENDER_DEADLINE_MS,
  isPdfRenderTimeout,
  raceWithTimeout,
  remainingDeadlineMs,
  renderDeadlineMs,
} from "../render-deadline";

const DEADLINE_ENV_VAR = "PDF_RENDER_DEADLINE_MS";

afterEach(() => {
  vi.unstubAllEnvs();
});

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
    expect(remaining).toBeLessThanOrEqual(DEFAULT_RENDER_DEADLINE_MS);
    expect(remaining).toBeGreaterThan(DEFAULT_RENDER_DEADLINE_MS - 50);
  });
});

describe("renderDeadlineMs", () => {
  it("uses the default when unset", () => {
    // Arrange
    vi.stubEnv(DEADLINE_ENV_VAR, "");

    // Act & Assert
    expect(renderDeadlineMs()).toBe(DEFAULT_RENDER_DEADLINE_MS);
  });

  it("honours an operator override", () => {
    // Arrange - a host with a shorter request cap than Azure's
    vi.stubEnv(DEADLINE_ENV_VAR, "8000");

    // Act & Assert
    expect(renderDeadlineMs()).toBe(8_000);
    expect(remainingDeadlineMs(Date.now())).toBeLessThanOrEqual(8_000);
  });

  /**
   * A typo in an operator's environment must not take exports down - there is
   * always a safe number to fall back to.
   */
  it.each(["not-a-number", "0", "-1", "   "])(
    "falls back to the default for %p",
    (value) => {
      // Arrange
      vi.stubEnv(DEADLINE_ENV_VAR, value);

      // Act & Assert
      expect(renderDeadlineMs()).toBe(DEFAULT_RENDER_DEADLINE_MS);
    },
  );
});
