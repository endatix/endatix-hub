import { describe, expect, it } from "vitest";
import { getDisplayLabel, hasExplicitLabel } from "../item-labels";

describe("hasExplicitLabel", () => {
  it("is true when the label differs from the value", () => {
    // Act & Assert
    expect(hasExplicitLabel({ value: "item1", text: "Golden retriever" })).toBe(
      true,
    );
  });

  it("is false when SurveyJS fell back to the value as text", () => {
    // Arrange — ItemValue.text returns the value when no text was authored
    // Act & Assert
    expect(hasExplicitLabel({ value: "item1", text: "item1" })).toBe(false);
  });

  it("is false for missing or blank text", () => {
    // Act & Assert
    expect(hasExplicitLabel({ value: "item1" })).toBe(false);
    expect(hasExplicitLabel({ value: "item1", text: "   " })).toBe(false);
  });

  it("ignores surrounding whitespace when comparing", () => {
    // Act & Assert
    expect(hasExplicitLabel({ value: "item1", text: " item1 " })).toBe(false);
  });

  it("handles non-string values", () => {
    // Act & Assert
    expect(hasExplicitLabel({ value: 3, text: "3" })).toBe(false);
    expect(hasExplicitLabel({ value: 3, text: "Three" })).toBe(true);
  });
});

describe("getDisplayLabel", () => {
  it("returns the authored label", () => {
    // Act & Assert
    expect(getDisplayLabel({ value: "item1", text: "Spaniel" })).toBe(
      "Spaniel",
    );
  });

  it("returns an empty string when no label was authored", () => {
    // Act & Assert
    expect(getDisplayLabel({ value: "item1", text: "item1" })).toBe("");
    expect(getDisplayLabel({ value: "item1" })).toBe("");
  });
});
