import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_RENDER_TIMEOUT_SECONDS,
  isPdfRenderTimeout,
  raceWithTimeout,
  remainingRenderTimeoutMs,
  renderTimeoutMs,
} from "../render-timeout";

const TIMEOUT_ENV_VAR = "PDF_RENDER_TIMEOUT_SECONDS";
const DEFAULT_MS = DEFAULT_RENDER_TIMEOUT_SECONDS * 1000;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("render-timeout", () => {
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

  it("computes remaining time from start time", () => {
    // Act
    const remaining = remainingRenderTimeoutMs(Date.now());

    // Assert
    expect(remaining).toBeLessThanOrEqual(DEFAULT_MS);
    expect(remaining).toBeGreaterThan(DEFAULT_MS - 50);
  });
});

describe("renderTimeoutMs", () => {
  it("uses the default when unset", () => {
    // Arrange
    vi.stubEnv(TIMEOUT_ENV_VAR, "");

    // Act & Assert
    expect(renderTimeoutMs()).toBe(DEFAULT_MS);
  });

  /** Configured in seconds, used in milliseconds. */
  it("reads the override as seconds", () => {
    // Arrange - a host with a shorter request cap than Azure's
    vi.stubEnv(TIMEOUT_ENV_VAR, "8");

    // Act & Assert
    expect(renderTimeoutMs()).toBe(8_000);
    expect(remainingRenderTimeoutMs(Date.now())).toBeLessThanOrEqual(8_000);
  });

  /**
   * A typo in an operator's environment must not take exports down - there is
   * always a safe number to fall back to.
   */
  it.each(["not-a-number", "0", "-1", "   "])(
    "falls back to the default for %p",
    (value) => {
      // Arrange
      vi.stubEnv(TIMEOUT_ENV_VAR, value);

      // Act & Assert
      expect(renderTimeoutMs()).toBe(DEFAULT_MS);
    },
  );
});
