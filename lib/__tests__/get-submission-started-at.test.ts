import { describe, expect, it } from "vitest";
import { getElapsedTimeString, getSubmissionStartedAt } from "@/lib/utils";

describe("getSubmissionStartedAt", () => {
  it("prefers startedAt when present", () => {
    // Arrange
    const createdAt = new Date("2026-01-01T10:00:00.000Z");
    const startedAt = new Date("2026-01-01T12:00:00.000Z");

    // Act
    const result = getSubmissionStartedAt({ createdAt, startedAt });

    // Assert
    expect(result.getTime()).toBe(startedAt.getTime());
  });

  it("falls back to createdAt when startedAt is missing", () => {
    // Arrange
    const createdAt = new Date("2026-01-01T10:00:00.000Z");

    // Act
    const result = getSubmissionStartedAt({ createdAt });

    // Assert
    expect(result.getTime()).toBe(createdAt.getTime());
  });

  it("drives completion duration from startedAt not createdAt", () => {
    // Arrange
    const createdAt = new Date("2026-01-01T08:00:00.000Z");
    const startedAt = new Date("2026-01-01T10:00:00.000Z");
    const completedAt = new Date("2026-01-01T10:00:05.000Z");

    // Act
    const duration = getElapsedTimeString(
      getSubmissionStartedAt({ createdAt, startedAt }),
      completedAt,
    );

    // Assert
    expect(duration).toBe("00:00:05");
  });
});

describe("getElapsedTimeString compact format", () => {
  it("formats duration as human shorthand", () => {
    // Arrange
    const startedAt = new Date("2026-01-01T10:00:00.000Z");
    const completedAt = new Date("2026-01-01T10:01:41.000Z");

    // Act
    const duration = getElapsedTimeString(startedAt, completedAt, "compact");

    // Assert
    expect(duration).toBe("1m 41s");
  });

  it("omits zero units and keeps seconds when only seconds elapsed", () => {
    // Arrange
    const startedAt = new Date("2026-01-01T10:00:00.000Z");
    const completedAt = new Date("2026-01-01T12:03:00.000Z");
    const zeroDurationEnd = new Date("2026-01-01T10:00:00.000Z");

    // Act
    const withHours = getElapsedTimeString(startedAt, completedAt, "compact");
    const zero = getElapsedTimeString(startedAt, zeroDurationEnd, "compact");

    // Assert
    expect(withHours).toBe("2h 3m");
    expect(zero).toBe("0s");
  });
});
