import { describe, expect, it } from "vitest";
import {
  describeCollectionStatus,
  isReviewApplicable,
} from "../../ui/describe-collection-status";

describe("describeCollectionStatus", () => {
  it("maps a built-in code to its group, tone and label", () => {
    // Act & Assert
    expect(describeCollectionStatus("COMPLETE", false)).toEqual({
      group: "complete",
      tone: "on",
      label: "Complete",
    });
    expect(describeCollectionStatus(" expired ", true)).toEqual({
      group: "open",
      tone: "attention",
      label: "Expired",
    });
    expect(describeCollectionStatus("screen_out", false)).toEqual({
      group: "ended",
      tone: "off",
      label: "Screened out",
    });
  });

  it("groups not-started and viewed as unengaged, apart from in progress", () => {
    // Act & Assert
    expect(describeCollectionStatus("not_started", false)).toEqual({
      group: "unengaged",
      tone: "idle",
      label: "Not started",
    });
    expect(describeCollectionStatus("Viewed", false)).toEqual({
      group: "unengaged",
      tone: "idle",
      label: "Viewed",
    });
    expect(describeCollectionStatus("in_progress", false).tone).toBe(
      "attention",
    );
  });

  it("falls back to isComplete when no code is supplied", () => {
    // Act & Assert
    expect(describeCollectionStatus(undefined, true).label).toBe("Complete");
    expect(describeCollectionStatus("  ", false).label).toBe("In progress");
  });

  it("renders an unknown code as ended with a humanized label", () => {
    // Act & Assert
    expect(describeCollectionStatus("panel_hold", true)).toEqual({
      group: "ended",
      tone: "off",
      label: "Panel hold",
    });
    expect(describeCollectionStatus("canceled", false).label).toBe("Canceled");
    expect(describeCollectionStatus("constructor", false)).toEqual({
      group: "ended",
      tone: "off",
      label: "Constructor",
    });
  });
});

describe("isReviewApplicable", () => {
  it("applies once collection is complete", () => {
    // Arrange
    const complete = describeCollectionStatus("complete", true);

    // Act & Assert
    expect(isReviewApplicable(complete, "new")).toBe(true);
  });

  it("does not apply to a submission not yet engaged, still being collected or ended", () => {
    // Arrange
    const inProgress = describeCollectionStatus("in_progress", false);
    const notStarted = describeCollectionStatus("not_started", false);
    const viewed = describeCollectionStatus("viewed", false);
    const screenedOut = describeCollectionStatus("screen_out", false);

    // Act & Assert
    expect(isReviewApplicable(inProgress, "new")).toBe(false);
    expect(isReviewApplicable(screenedOut, undefined)).toBe(false);
    expect(isReviewApplicable(notStarted, "new")).toBe(false);
    expect(isReviewApplicable(viewed, undefined)).toBe(false);
  });

  it("keeps a review already recorded on an incomplete submission", () => {
    // Arrange
    const inProgress = describeCollectionStatus("in_progress", false);

    // Act & Assert
    expect(isReviewApplicable(inProgress, "Approved")).toBe(true);
  });
});
