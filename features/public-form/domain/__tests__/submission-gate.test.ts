import { describe, expect, it } from "vitest";
import { resolveSubmissionGate } from "../submission-gate";

describe("resolveSubmissionGate", () => {
  it("returns active for access token flows even when user already submitted", () => {
    // Arrange & Act
    const phase = resolveSubmissionGate({
      canStartNewSubmission: false,
      hasUserSubmitted: true,
      hasResumableDraft: false,
      hasUrlToken: true,
    });

    // Assert
    expect(phase).toBe("active");
  });

  it("returns active when user has a resumable draft", () => {
    // Arrange & Act
    const phase = resolveSubmissionGate({
      canStartNewSubmission: false,
      hasUserSubmitted: true,
      hasResumableDraft: true,
      hasUrlToken: false,
    });

    // Assert
    expect(phase).toBe("active");
  });

  it("returns blocked when user already submitted and has no resumable draft", () => {
    // Arrange & Act
    const phase = resolveSubmissionGate({
      canStartNewSubmission: false,
      hasUserSubmitted: true,
      hasResumableDraft: false,
      hasUrlToken: false,
    });

    // Assert
    expect(phase).toBe("blocked");
  });

  it("returns active when user cannot create but has not submitted", () => {
    const phase = resolveSubmissionGate({
      canStartNewSubmission: false,
      hasUserSubmitted: false,
      hasResumableDraft: false,
      hasUrlToken: false,
    });

    expect(phase).toBe("active");
  });

  it("returns active when backend allows a new submission", () => {
    const phase = resolveSubmissionGate({
      canStartNewSubmission: true,
      hasUserSubmitted: false,
      hasResumableDraft: false,
      hasUrlToken: false,
    });

    expect(phase).toBe("active");
  });
});
