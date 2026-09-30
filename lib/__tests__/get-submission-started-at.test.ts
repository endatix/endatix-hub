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

describe("getElapsedTimeString", () => {
  it("returns a dash when a bound is missing or the end is before the start", () => {
    // Arrange
    const startedAt = new Date("2026-01-01T10:00:00.000Z");

    // Act & Assert
    expect(getElapsedTimeString(undefined, startedAt, "compact")).toBe("-");
    expect(getElapsedTimeString(startedAt, undefined, "long")).toBe("-");
    expect(
      getElapsedTimeString(
        startedAt,
        new Date("2026-01-01T09:00:00.000Z"),
        "compact",
      ),
    ).toBe("-");
  });

  it("rolls a multi-day completion into days", () => {
    // Arrange — 50 days and 1 hour, plus minutes the table must not show
    const startedAt = new Date("2026-01-01T00:00:00.000Z");
    const completedAt = new Date("2026-02-20T01:09:52.000Z");

    // Act & Assert
    expect(getElapsedTimeString(startedAt, completedAt, "compact")).toBe(
      "50d 1h",
    );
    expect(getElapsedTimeString(startedAt, completedAt, "long")).toBe(
      "50 days 1 hour",
    );
  });
});
