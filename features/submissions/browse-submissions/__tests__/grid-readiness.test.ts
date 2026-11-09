import { describe, expect, it } from "vitest";
import type { SubmissionGridReadiness } from "@/lib/endatix-api/reporting/submission-grid-types";
import {
  countUnprepared,
  describeGridReadiness,
  describeRowsBanner,
} from "../grid-readiness";

function readiness(
  overrides: Partial<SubmissionGridReadiness> = {},
): SubmissionGridReadiness {
  const counts = {
    submissions: 10,
    completedSubmissions: 8,
    prepared: 8,
    pending: 0,
    failed: 0,
    skippedInProgress: 2,
    ...overrides,
  };
  // The API sends inProgress as submissions minus completed ones.
  return {
    inProgress: counts.submissions - counts.completedSubmissions,
    ...counts,
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
      canPrepare: true,
    });

    // Assert
    expect(banner).toBeNull();
  });

  it("hides the waiting filters banner when the form has no submissions", () => {
    // Act
    const banner = describeGridReadiness({
      schemaReady: true,
      readiness: readiness({
        submissions: 0,
        completedSubmissions: 0,
        prepared: 0,
      }),
      canPrepare: true,
      answerFiltersWaiting: true,
    });

    // Assert
    expect(banner).toBeNull();
  });

  it("offers Prepare and not in-progress when the form has no schema", () => {
    // Act
    const banner = describeGridReadiness({
      schemaReady: false,
      readiness: readiness({ prepared: 0 }),
      canPrepare: true,
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
      canPrepare: true,
    });

    // Assert
    expect(banner).toBeNull();
  });

  it("offers Prepare for completed submissions that are not prepared", () => {
    // Act
    const banner = describeGridReadiness({
      schemaReady: true,
      readiness: readiness({ submissions: 8, prepared: 7 }),
      canPrepare: true,
    });

    // Assert
    expect(banner).toMatchObject({
      lines: ["1 submission completed is not prepared."],
      showPrepare: true,
      showIncludeInProgress: false,
    });
  });

  it("offers Include in-progress to users who may export or edit", () => {
    // Act
    const banner = describeGridReadiness({
      schemaReady: true,
      readiness: readiness(),
      canPrepare: true,
    });

    // Assert
    expect(banner).toMatchObject({
      lines: ["2 submissions in progress are not included."],
      showPrepare: false,
      showIncludeInProgress: true,
    });
  });

  it("shows the in-progress count without the button to users who may not prepare", () => {
    // Act
    const banner = describeGridReadiness({
      schemaReady: true,
      readiness: readiness(),
      canPrepare: false,
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
      canPrepare: true,
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
      canPrepare: true,
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

describe("describeGridReadiness without export or edit permission", () => {
  it("shows the counts without Prepare or Include in-progress", () => {
    // Act
    const banner = describeGridReadiness({
      schemaReady: true,
      readiness: readiness({ submissions: 8, prepared: 4 }),
      canPrepare: false,
    });

    // Assert
    expect(banner).toMatchObject({
      showPrepare: false,
      showIncludeInProgress: false,
    });
    expect(banner?.lines.length).toBeGreaterThan(0);
  });

  it("does not offer Prepare on a form whose reporting data is not prepared", () => {
    // Act
    const banner = describeGridReadiness({
      schemaReady: false,
      readiness: readiness({ prepared: 0 }),
      canPrepare: false,
    });

    // Assert
    expect(banner).toMatchObject({ showPrepare: false });
  });
});

describe("describeRowsBanner", () => {
  it("hides the banner without answer filters", () => {
    expect(describeRowsBanner({ canPrepare: true })).toBeNull();
  });

  it("hides the banner when the filters checked every submission", () => {
    // Act
    const banner = describeRowsBanner({
      coverage: { uncheckedCompleted: 0, uncheckedInProgress: 0 },
      canPrepare: true,
    });

    // Assert
    expect(banner).toBeNull();
  });

  it("counts unchecked submissions and offers both actions to a user who may prepare", () => {
    // Act
    const banner = describeRowsBanner({
      coverage: { uncheckedCompleted: 3, uncheckedInProgress: 1 },
      canPrepare: true,
    });

    // Assert
    expect(banner).toMatchObject({
      title: "Some submissions were not checked",
      showPrepare: true,
      showIncludeInProgress: true,
    });
    expect(banner?.lines).toEqual([
      "3 submissions completed are not prepared, so the answer filters did not check them.",
      "1 submission in progress is not included, so the answer filters did not check it.",
    ]);
  });

  it("shows the in-progress count without its action to a viewer", () => {
    // Act
    const banner = describeRowsBanner({
      coverage: { uncheckedCompleted: 0, uncheckedInProgress: 2 },
      canPrepare: false,
    });

    // Assert
    expect(banner).toMatchObject({
      showPrepare: false,
      showIncludeInProgress: false,
    });
    expect(banner?.lines).toHaveLength(1);
  });

  it("says the answer filters are off without offering Prepare to a viewer", () => {
    // Act
    const banner = describeRowsBanner({
      answerFiltersNotPrepared: true,
      canPrepare: false,
    });

    // Assert
    expect(banner).toMatchObject({ showPrepare: false });
  });

  it("says the answer filters are off and offers Prepare without a schema", () => {
    // Act
    const banner = describeRowsBanner({
      answerFiltersNotPrepared: true,
      canPrepare: true,
    });

    // Assert
    expect(banner).toMatchObject({
      title: "Answer filters are off",
      showPrepare: true,
      showIncludeInProgress: false,
    });
  });
});
