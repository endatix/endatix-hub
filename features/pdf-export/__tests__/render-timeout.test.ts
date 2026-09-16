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
  vi.useRealTimers();
});

describe("render-timeout", () => {
  it("fails immediately when no budget remains", async () => {
    // Arrange
    const createWork = vi.fn(async () => "ok");

    // Act & Assert
    await expect(raceWithTimeout(createWork, 0)).rejects.toThrow(
      "pdf_render_timeout",
    );
    expect(createWork).not.toHaveBeenCalled();
  });

  it("resolves when work finishes inside the budget", async () => {
    // Arrange & Act
    const result = await raceWithTimeout(async () => "ok", 1_000);

    // Assert
    expect(result).toBe("ok");
  });

  it("classifies timeout errors", () => {
    // Arrange & Act & Assert
    expect(isPdfRenderTimeout(new Error("pdf_render_timeout"))).toBe(true);
    expect(isPdfRenderTimeout(new Error("other"))).toBe(false);
  });

  it("computes remaining time from start time", () => {
    // Arrange
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const startedAtMs = Date.now();

    // Act
    vi.setSystemTime(new Date("2026-01-01T00:00:10.000Z"));
    const remaining = remainingRenderTimeoutMs(startedAtMs);

    // Assert
    expect(remaining).toBe(DEFAULT_MS - 10_000);
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
    expect(remainingRenderTimeoutMs(Date.now())).toBe(8_000);
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
