import { describe, expect, it } from "vitest";
import { resolveSubmissionGate } from "../submission-gate";

const open = {
  canStartNewSubmission: true,
  hasUserSubmitted: false,
  hasUrlToken: false,
  hasSubmission: false,
  isComplete: false,
} as const;

describe("resolveSubmissionGate", () => {
  it.each([
    ["not_started", "resume"],
    ["viewed", "resume"],
    ["in_progress", "resume"],
    ["expired", "resume"],
    ["complete", "completed"],
    ["screen_out", "completed"],
    ["quota_full", "closed"],
    ["abandoned", "closed"],
    ["cancelled", "closed"],
    ["custom_code", "closed"],
  ] as const)("maps %s to %s", (collectionStatus, phase) => {
    // Arrange
    const input = {
      ...open,
      hasSubmission: true,
      collectionStatus,
      isComplete: collectionStatus === "complete",
    };

    // Act
    const result = resolveSubmissionGate(input);

    // Assert
    expect(result).toBe(phase);
  });

  it("treats a missing status with isComplete as completed", () => {
    // Arrange
    const input = { ...open, hasSubmission: true, isComplete: true };

    // Act
    const result = resolveSubmissionGate(input);

    // Assert
    expect(result).toBe("completed");
  });

  it("never resumes a completed submission with an unknown status", () => {
    // Arrange
    const input = {
      ...open,
      hasSubmission: true,
      collectionStatus: "custom_code",
      isComplete: true,
    };

    // Act
    const result = resolveSubmissionGate(input);

    // Assert
    expect(result).toBe("completed");
  });

  it.each([
    ["in_progress", false, "resume"],
    ["screen_out", false, "completed"],
    ["cancelled", false, "closed"],
    ["complete", true, "completed"],
  ] as const)(
    "maps a URL token on %s to %s",
    (collectionStatus, isComplete, phase) => {
      // Arrange
      const input = {
        ...open,
        hasUrlToken: true,
        hasSubmission: true,
        collectionStatus,
        isComplete,
      };

      // Act
      const result = resolveSubmissionGate(input);

      // Assert
      expect(result).toBe(phase);
    },
  );

  it.each([
    ["screen_out", false],
    ["complete", true],
  ] as const)(
    "blocks a one-per-user revisit when the loaded submission is %s",
    (collectionStatus, isComplete) => {
      // Arrange
      const input = {
        ...open,
        canStartNewSubmission: false,
        hasUserSubmitted: true,
        hasSubmission: true,
        collectionStatus,
        isComplete,
      };

      // Act
      const result = resolveSubmissionGate(input);

      // Assert
      expect(result).toBe("blocked");
    },
  );

  it("resumes a one-per-user draft", () => {
    // Arrange
    const input = {
      ...open,
      canStartNewSubmission: false,
      hasUserSubmitted: true,
      hasSubmission: true,
      collectionStatus: "in_progress",
    };

    // Act
    const result = resolveSubmissionGate(input);

    // Assert
    expect(result).toBe("resume");
  });

  it("blocks a one-per-user revisit with no submission loaded", () => {
    // Arrange
    const input = {
      ...open,
      canStartNewSubmission: false,
      hasUserSubmitted: true,
    };

    // Act
    const result = resolveSubmissionGate(input);

    // Assert
    expect(result).toBe("blocked");
  });
});
