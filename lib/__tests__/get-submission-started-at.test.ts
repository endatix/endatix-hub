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
