import { describe, expect, it } from "vitest";
import {
  type FacetedFilterGroup,
  groupSelection,
  summarizeSelection,
  toFacetedFilterGroups,
  toggleGroup,
  toggleValue,
} from "../faceted-filter-selection";

const notEngaged: FacetedFilterGroup = {
  label: "Not engaged",
  tone: "idle",
  options: [
    { label: "Not started", value: "not_started", tone: "idle" },
    { label: "Viewed", value: "viewed", tone: "idle" },
  ],
};
const complete: FacetedFilterGroup = {
  label: "Complete",
  tone: "on",
  options: [{ label: "Complete", value: "complete", tone: "on" }],
};
const groups = [notEngaged, complete];

describe("groupSelection", () => {
  it("reports none, some and all", () => {
    // Act & Assert
    expect(groupSelection(notEngaged, new Set())).toBe("none");
    expect(groupSelection(notEngaged, new Set(["viewed"]))).toBe("some");
    expect(groupSelection(notEngaged, new Set(["viewed", "not_started"]))).toBe(
      "all",
    );
  });

  it("ignores values from other groups", () => {
    // Act & Assert
    expect(groupSelection(notEngaged, new Set(["complete"]))).toBe("none");
  });
});

describe("toggleGroup", () => {
  it("fills an unselected or partly selected group and keeps other values", () => {
    // Act
    const fromNone = toggleGroup(notEngaged, new Set(["complete"]));
    const fromSome = toggleGroup(notEngaged, new Set(["viewed"]));

    // Assert
    expect([...fromNone].sort()).toEqual(["complete", "not_started", "viewed"]);
    expect([...fromSome].sort()).toEqual(["not_started", "viewed"]);
  });

  it("clears a fully selected group and keeps other values", () => {
    // Act
    const next = toggleGroup(
      notEngaged,
      new Set(["not_started", "viewed", "complete"]),
    );

    // Assert
    expect([...next]).toEqual(["complete"]);
  });

  it("does not mutate the selection it was given", () => {
    // Arrange
    const selected = new Set(["viewed"]);

    // Act
    toggleGroup(notEngaged, selected);

    // Assert
    expect([...selected]).toEqual(["viewed"]);
  });
});

describe("toggleValue", () => {
  it("adds a missing value and removes a present one", () => {
    // Act & Assert
    expect([...toggleValue("viewed", new Set())]).toEqual(["viewed"]);
    expect([...toggleValue("viewed", new Set(["viewed"]))]).toEqual([]);
  });
});

describe("summarizeSelection", () => {
  it("collapses a fully selected group to one chip with the group label and tone", () => {
    // Act
    const chips = summarizeSelection(
      groups,
      new Set(["not_started", "viewed"]),
    );

    // Assert
    expect(chips).toEqual([
      { key: "group:Not engaged", label: "Not engaged", tone: "idle" },
    ]);
  });

  it("lists options of a partly selected group, in menu order", () => {
    // Act
    const chips = summarizeSelection(groups, new Set(["complete", "viewed"]));

    // Assert
    expect(chips.map((chip) => chip.label)).toEqual(["Viewed", "Complete"]);
  });

  it("shows a one-option group by its option, never as a group", () => {
    // Act
    const chips = summarizeSelection(groups, new Set(["complete"]));

    // Assert
    expect(chips).toEqual([{ key: "complete", label: "Complete", tone: "on" }]);
  });

  it("returns nothing for an empty selection and ignores unknown values", () => {
    // Act & Assert
    expect(summarizeSelection(groups, new Set())).toEqual([]);
    expect(summarizeSelection(groups, new Set(["panel_hold"]))).toEqual([]);
  });
});

describe("toFacetedFilterGroups", () => {
  it("wraps each flat option in its own one-option group", () => {
    // Act
    const wrapped = toFacetedFilterGroups([
      { label: "Production", value: "false" },
      { label: "Test", value: "true" },
    ]);

    // Assert
    expect(wrapped.map((group) => group.options.length)).toEqual([1, 1]);
    expect(wrapped.map((group) => group.label)).toEqual(["Production", "Test"]);
  });
});
