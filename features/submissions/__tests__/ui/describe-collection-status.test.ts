import { describe, expect, it } from "vitest";
import {
  COLLECTION_STATUS_FILTER_CODES,
  COLLECTION_STATUS_GROUPS,
  collectionStatusFromLegacyIsComplete,
  collectionStatusGroupTone,
  completionCoversCollectionStatus,
  describeCollectionStatus,
  isCompleteValuesFromCollectionStatus,
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

describe("COLLECTION_STATUS_GROUPS", () => {
  it("lists every filter code exactly once, Complete first, then lifecycle order", () => {
    // Act
    const codes = COLLECTION_STATUS_GROUPS.flatMap((entry) => entry.codes);

    // Assert
    expect(codes).toEqual([...COLLECTION_STATUS_FILTER_CODES]);
    expect(new Set(codes).size).toBe(codes.length);
    expect(COLLECTION_STATUS_GROUPS.map((entry) => entry.group)).toEqual([
      "complete",
      "unengaged",
      "open",
      "ended",
    ]);
  });

  it("puts each code in the group describeCollectionStatus gives it", () => {
    // Act & Assert
    for (const entry of COLLECTION_STATUS_GROUPS) {
      for (const code of entry.codes) {
        expect(describeCollectionStatus(code, false).group).toBe(entry.group);
      }
    }
  });

  it("never labels a multi-code group like one of its members", () => {
    // Act & Assert
    for (const entry of COLLECTION_STATUS_GROUPS) {
      if (entry.codes.length < 2) {
        continue;
      }
      const memberLabels = entry.codes.map(
        (code) => describeCollectionStatus(code, false).label,
      );
      expect(memberLabels).not.toContain(entry.label);
    }
  });

  it("gives a group the tone its codes have", () => {
    // Act & Assert
    for (const entry of COLLECTION_STATUS_GROUPS) {
      expect(collectionStatusGroupTone(entry.group)).toBe(
        describeCollectionStatus(entry.codes[0], false).tone,
      );
    }
  });
});

describe("isCompleteValuesFromCollectionStatus", () => {
  it("maps complete to true and every other code to false, once each", () => {
    // Act & Assert
    expect(isCompleteValuesFromCollectionStatus([])).toEqual([]);
    expect(isCompleteValuesFromCollectionStatus(["complete"])).toEqual([
      "true",
    ]);
    expect(
      isCompleteValuesFromCollectionStatus(["not_started", "viewed"]),
    ).toEqual(["false"]);
    expect(
      isCompleteValuesFromCollectionStatus(["complete", "cancelled"]).sort(),
    ).toEqual(["false", "true"]);
  });
});

describe("collectionStatusFromLegacyIsComplete", () => {
  it("maps true to complete and false to every other built-in code", () => {
    // Act & Assert
    expect(collectionStatusFromLegacyIsComplete("true")).toEqual(["complete"]);
    expect(collectionStatusFromLegacyIsComplete("false")).toEqual(
      COLLECTION_STATUS_FILTER_CODES.filter((code) => code !== "complete"),
    );
  });

  it("means no filter for both values, none, or junk", () => {
    // Act & Assert
    expect(collectionStatusFromLegacyIsComplete("true,false")).toEqual([]);
    expect(collectionStatusFromLegacyIsComplete(undefined)).toEqual([]);
    expect(collectionStatusFromLegacyIsComplete("")).toEqual([]);
    expect(collectionStatusFromLegacyIsComplete("yes")).toEqual([]);
  });
});

describe("completionCoversCollectionStatus", () => {
  it("is true when Completed / Incomplete / All match the list exactly, including every code selected", () => {
    // Arrange
    const everyNotComplete = COLLECTION_STATUS_FILTER_CODES.filter(
      (code) => code !== "complete",
    );

    // Act & Assert
    expect(completionCoversCollectionStatus([])).toBe(true);
    expect(completionCoversCollectionStatus(["complete"])).toBe(true);
    expect(completionCoversCollectionStatus(everyNotComplete)).toBe(true);
    expect(
      completionCoversCollectionStatus([...COLLECTION_STATUS_FILTER_CODES]),
    ).toBe(true);
  });

  it("is false when the list is narrower than any completion choice", () => {
    // Act & Assert
    expect(completionCoversCollectionStatus(["in_progress"])).toBe(false);
    expect(completionCoversCollectionStatus(["not_started", "viewed"])).toBe(
      false,
    );
    expect(completionCoversCollectionStatus(["complete", "cancelled"])).toBe(
      false,
    );
  });
});
