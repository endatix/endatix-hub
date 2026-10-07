import { describe, expect, it } from "vitest";
import {
  collectionDisposition,
  isSubmissionEditable,
  RESUMABLE_COLLECTION_STATUSES,
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
