import { describe, expect, it } from "vitest";
import {
  collectionDisposition,
  BUILT_IN_COLLECTION_STATUSES,
  COLLECTION_STATUS_CATALOG,
  isBuiltInCollectionStatus,
  isSubmissionEditable,
  RESUMABLE_COLLECTION_STATUSES,
  SHIPPED_COLLECTION_STATUSES,
} from "../collection-status";

describe("collectionDisposition", () => {
  it("pins the API's resumable codes (Submission.IsResumableCollection)", () => {
    // Act & Assert
    expect(RESUMABLE_COLLECTION_STATUSES).toEqual([
      "not_started",
      "viewed",
      "in_progress",
      "expired",
    ]);
  });

  it.each([
    [undefined, false, "open"],
    ["not_started", false, "open"],
    ["viewed", false, "open"],
    ["in_progress", false, "open"],
    ["expired", false, "open"],
    ["complete", true, "complete"],
    [undefined, true, "complete"],
    ["custom_code", true, "complete"],
    ["custom_code", false, "closed"],
    ["screen_out", false, "closed"],
    ["quota_full", false, "closed"],
    ["abandoned", false, "closed"],
    ["cancelled", false, "closed"],
  ] as const)(
    "maps %s (isComplete %s) to %s",
    (status, isComplete, expected) => {
      // Act
      const disposition = collectionDisposition(status, isComplete);

      // Assert
      expect(disposition).toBe(expected);
    },
  );
});

describe("COLLECTION_STATUS_CATALOG", () => {
  it("defines each built-in code once, in lifecycle order", () => {
    // Act & Assert
    expect(BUILT_IN_COLLECTION_STATUSES).toEqual([
      "not_started",
      "viewed",
      "in_progress",
      "expired",
      "complete",
      "screen_out",
      "quota_full",
      "abandoned",
      "cancelled",
    ]);
    expect(new Set(BUILT_IN_COLLECTION_STATUSES).size).toBe(
      COLLECTION_STATUS_CATALOG.length,
    );
  });

  it("ships only the codes the API writes today", () => {
    // Act & Assert
    expect(SHIPPED_COLLECTION_STATUSES).toEqual([
      "not_started",
      "in_progress",
      "complete",
      "screen_out",
    ]);
  });

  it.each([
    ["viewed", true],
    ["cancelled", true],
    ["custom_code", false],
    ["", false],
  ])("treats %s as built-in: %s", (code, expected) => {
    // Act & Assert
    expect(isBuiltInCollectionStatus(code)).toBe(expected);
  });
});

describe("isSubmissionEditable", () => {
  it.each([
    ["screen_out", false],
    ["complete", true],
    ["in_progress", true],
    [undefined, true],
  ] as const)("returns %s → %s", (status, expected) => {
    // Act & Assert
    expect(isSubmissionEditable(status)).toBe(expected);
  });
});
