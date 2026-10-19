import { describe, expect, it } from "vitest";
import type { SubmissionGridReadiness } from "@/lib/endatix-api/reporting/submission-grid-types";
import { countUnprepared, describeGridReadiness } from "../grid-readiness";

function readiness(
  overrides: Partial<SubmissionGridReadiness> = {},
): SubmissionGridReadiness {
  return {
    submissions: 10,
    completedSubmissions: 8,
    prepared: 8,
    pending: 0,
    failed: 0,
    skippedInProgress: 2,
    ...overrides,
  };
}

describe("countUnprepared", () => {
  it("takes prepared rows as completed first", () => {
    expect(countUnprepared(readiness({ prepared: 5 }))).toEqual({
      completed: 3,
      inProgress: 2,
      preparing: 0,
    });
  });

  it("counts prepared rows beyond the completed ones as in progress", () => {
    expect(countUnprepared(readiness({ prepared: 9 }))).toEqual({
      completed: 0,
      inProgress: 1,
      preparing: 0,
    });
  });

  it("adds up to every submission that is not prepared", () => {
    // Arrange
    const counts = readiness({
      submissions: 40,
      completedSubmissions: 25,
      prepared: 17,
    });

    // Act
    const { completed, inProgress } = countUnprepared(counts);

    // Assert
    expect(completed + inProgress).toBe(40 - 17);
  });
});

describe("describeGridReadiness", () => {
  it("hides the banner when the form has no submissions", () => {
    // Act
    const banner = describeGridReadiness({
      schemaReady: false,
      readiness: readiness({
        submissions: 0,
        completedSubmissions: 0,
        prepared: 0,
      }),
      canIncludeInProgress: true,
    });

    // Assert
    expect(banner).toBeNull();
  });

  it("offers Prepare and not in-progress when the form has no schema", () => {
    // Act
    const banner = describeGridReadiness({
      schemaReady: false,
      readiness: readiness({ prepared: 0 }),
      canIncludeInProgress: true,
    });

    // Assert
    expect(banner).toMatchObject({
      showPrepare: true,
      showIncludeInProgress: false,
    });
  });

  it("hides the banner when every submission is prepared", () => {
    // Act
    const banner = describeGridReadiness({
      schemaReady: true,
      readiness: readiness({ prepared: 10 }),
      canIncludeInProgress: true,
    });

    // Assert
    expect(banner).toBeNull();
  });

  it("offers Prepare for completed submissions that are not prepared", () => {
    // Act
    const banner = describeGridReadiness({
      schemaReady: true,
      readiness: readiness({ submissions: 8, prepared: 7 }),
      canIncludeInProgress: false,
    });

    // Assert
    expect(banner).toMatchObject({
      lines: ["1 submission completed is not prepared."],
      showPrepare: true,
      showIncludeInProgress: false,
    });
  });

  it("offers Include in-progress to form editors", () => {
    // Act
    const banner = describeGridReadiness({
      schemaReady: true,
      readiness: readiness(),
      canIncludeInProgress: true,
    });

    // Assert
    expect(banner).toMatchObject({
      lines: ["2 submissions in progress are not included."],
      showPrepare: false,
      showIncludeInProgress: true,
    });
  });

  it("shows the in-progress count without the button to other users", () => {
    // Act
    const banner = describeGridReadiness({
      schemaReady: true,
      readiness: readiness(),
      canIncludeInProgress: false,
    });

    // Assert
    expect(banner?.lines).toEqual([
      "2 submissions in progress are not included.",
    ]);
    expect(banner?.showIncludeInProgress).toBe(false);
  });

  it("does not count submissions being prepared as not prepared", () => {
    // Act
    const banner = describeGridReadiness({
      schemaReady: true,
      readiness: readiness({ submissions: 8, prepared: 5, pending: 3 }),
      canIncludeInProgress: true,
    });

    // Assert
    expect(banner).toMatchObject({
      lines: ["3 submissions are being prepared."],
      showPrepare: false,
    });
  });

  it("offers Prepare for the completed submissions neither prepared nor pending", () => {
    // Act
    const banner = describeGridReadiness({
      schemaReady: true,
      readiness: readiness({ submissions: 8, prepared: 4, pending: 3 }),
      canIncludeInProgress: true,
    });

    // Assert
    expect(banner).toMatchObject({
      lines: [
        "1 submission completed is not prepared.",
        "3 submissions are being prepared.",
      ],
      showPrepare: true,
    });
  });
});
