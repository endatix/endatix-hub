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
    ["custom_code", "resume"],
    ["complete", "completed"],
    ["screen_out", "closed"],
    ["quota_full", "closed"],
    ["abandoned", "closed"],
    ["cancelled", "closed"],
  ] as const)("maps %s to %s", (collectionStatus, phase) => {
    expect(
      resolveSubmissionGate({
        ...open,
        hasSubmission: true,
        collectionStatus,
        isComplete: collectionStatus === "complete",
      }),
    ).toBe(phase);
  });

  it("treats a missing status with isComplete as completed", () => {
    expect(
      resolveSubmissionGate({
        ...open,
        hasSubmission: true,
        isComplete: true,
      }),
    ).toBe("completed");
  });

  it("resumes an in-progress token and closes a screened one", () => {
    const token = { ...open, hasUrlToken: true, hasSubmission: true };

    expect(
      resolveSubmissionGate({ ...token, collectionStatus: "in_progress" }),
    ).toBe("resume");
    expect(
      resolveSubmissionGate({ ...token, collectionStatus: "screen_out" }),
    ).toBe("closed");
    expect(
      resolveSubmissionGate({
        ...token,
        collectionStatus: "complete",
        isComplete: true,
      }),
    ).toBe("completed");
  });

  it("blocks a one-per-user revisit when the loaded submission is finished", () => {
    const revisit = {
      ...open,
      canStartNewSubmission: false,
      hasUserSubmitted: true,
      hasSubmission: true,
    };

    expect(
      resolveSubmissionGate({ ...revisit, collectionStatus: "screen_out" }),
    ).toBe("blocked");
    expect(
      resolveSubmissionGate({
        ...revisit,
        collectionStatus: "complete",
        isComplete: true,
      }),
    ).toBe("blocked");
  });

  it("resumes a one-per-user draft and blocks when nothing is open", () => {
    const revisit = {
      ...open,
      canStartNewSubmission: false,
      hasUserSubmitted: true,
    };

    expect(
      resolveSubmissionGate({
        ...revisit,
        hasSubmission: true,
        collectionStatus: "in_progress",
      }),
    ).toBe("resume");
    expect(resolveSubmissionGate({ ...revisit, hasSubmission: false })).toBe(
      "blocked",
    );
  });
});
