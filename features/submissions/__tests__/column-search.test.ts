import { describe, expect, it } from "vitest";
import type { SubmissionGridColumn } from "@/lib/endatix-api/reporting/submission-grid-types";
import {
  areSearchSlotsFull,
  columnSearchOf,
  describeUserSlots,
  searchKeyChangeFor,
} from "../column-search";

function wireColumn(
  overrides: Partial<SubmissionGridColumn> = {},
): SubmissionGridColumn {
  return {
    key: "q1",
    kind: "Simple",
    title: "Question one",
    questionType: "text",
    filterType: "text",
    pageName: null,
    pageTitle: null,
    panelTitle: null,
    ...overrides,
  };
}

const SLOTS = { used: 53, max: 64, userUsed: 3, userMax: 14 };

describe("columnSearchOf", () => {
  it.each([
    [
      "a built search key",
      { searchable: true, searchPending: false, searchSource: "auto" },
      { state: "ready", source: "auto" },
    ],
    [
      "a key whose search copy rebuilds",
      { searchable: true, searchPending: true, searchSource: "user" },
      { state: "preparing", source: "user" },
    ],
    [
      "a column with a filter type that is not a key",
      { searchable: false, searchSource: null },
      { state: "eligible", source: null },
    ],
    [
      "a column without a filter type",
      { filterType: null, searchable: false },
      { state: "unavailable", source: null },
    ],
    [
      "a submitter column",
      { kind: "SubmitterProfile", searchable: false },
      { state: "unavailable", source: null },
    ],
    [
      "a column from an API without search keys",
      {},
      { state: "ready", source: null },
    ],
  ] as const)("reads %s", (_, overrides, expected) => {
    // Act & Assert
    expect(columnSearchOf(wireColumn(overrides))).toEqual(expected);
  });
});

describe("searchKeyChangeFor", () => {
  it.each([
    [{ state: "eligible", source: null }, true, "add"],
    [{ state: "ready", source: "user" }, true, "remove"],
    [{ state: "preparing", source: "user" }, true, "remove"],
    [{ state: "ready", source: "auto" }, true, null],
    [{ state: "unavailable", source: null }, true, null],
    [{ state: "eligible", source: null }, false, null],
    [{ state: "ready", source: "user" }, false, null],
  ] as const)("is %o with edit %s → %s", (search, canEdit, expected) => {
    // Act & Assert
    expect(searchKeyChangeFor(search, canEdit)).toBe(expected);
  });
});

describe("search slots", () => {
  it("counts the slots people used of theirs", () => {
    expect(describeUserSlots(SLOTS)).toBe("3 of 14 chosen");
  });

  it("says none are left when people used all of theirs", () => {
    // Arrange
    const full = { ...SLOTS, userUsed: 14 };

    // Act & Assert
    expect(areSearchSlotsFull(full)).toBe(true);
    expect(describeUserSlots(full)).toBe("14 of 14 chosen, none left");
  });

  it("is full when the form reached its whole cap", () => {
    expect(areSearchSlotsFull({ ...SLOTS, used: 64 })).toBe(true);
  });
});
