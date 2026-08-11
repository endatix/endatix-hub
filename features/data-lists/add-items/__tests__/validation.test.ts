import { describe, expect, it } from "vitest";
import { validateJsonInput } from "../../utils";

describe("validateJsonInput", () => {
  it("returns error for empty input", () => {
    const result = validateJsonInput("");

    expect(result.validItems).toEqual([]);
    expect(result.errors).toContain("JSON content is required.");
    expect(result.annotations).toHaveLength(1);
    expect(result.annotations[0].type).toBe("error");
  });

  it("returns error for invalid JSON", () => {
    const result = validateJsonInput("{ invalid }");

    expect(result.validItems).toEqual([]);
    expect(result.errors).toContain("Invalid JSON format.");
    expect(result.annotations[0].text).toBe("Invalid JSON format.");
  });

  it("returns error when root is not array", () => {
    const result = validateJsonInput('{"key": "value"}');

    expect(result.validItems).toEqual([]);
    expect(result.errors).toContain("JSON root must be an array of objects.");
  });

  it("returns error for empty array", () => {
    const result = validateJsonInput("[]");

    expect(result.validItems).toEqual([]);
    expect(result.errors).toContain("At least one item is required.");
  });

  it("validates items and returns structured annotations", () => {
    const result = validateJsonInput(
      '[{"label": "Option 1", "value": "opt1"}, {"value": "opt2"}]',
    );

    expect(result.validItems).toHaveLength(1);
    expect(result.validItems[0]).toEqual({
      value: "opt1",
      labels: { default: "Option 1" },
    });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("label is required");

    expect(result.annotations).toHaveLength(1);
    expect(result.annotations[0].text).toContain("label is required");
  });

  it("returns valid items with all required fields", () => {
    const result = validateJsonInput(
      '[{"label": "A", "value": "a"}, {"label": "B", "value": "b"}]',
    );

    expect(result.validItems).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.annotations).toHaveLength(0);
  });

  it("validates field length constraints", () => {
    const longLabel = "x".repeat(101);
    const result = validateJsonInput(
      `[{"label": "${longLabel}", "value": "a"}]`,
    );

    expect(result.errors.some((e) => e.includes("exceeds 100"))).toBe(true);
    expect(result.annotations.some((a) => a.text.includes("exceeds 100"))).toBe(
      true,
    );
  });

  it("uses row indexing accounting for array bracket", () => {
    const result = validateJsonInput(
      '[{"label": "Good", "value": "g"}, {"label": "", "value": "x"}]',
    );

    const missingLabelError = result.annotations.find((a) =>
      a.text.includes("label is required"),
    );
    expect(missingLabelError).toBeDefined();
    expect(missingLabelError?.row).toBe(2);
  });

  it("finds correct row for multiline JSON", () => {
    const multilineJson = `[
  {"label": "First", "value": "a"},
  {"label": "", "value": "b"}
]`;
    const result = validateJsonInput(multilineJson);

    const missingLabelError = result.annotations.find((a) =>
      a.text.includes("label is required"),
    );
    expect(missingLabelError).toBeDefined();
    expect(missingLabelError?.row).toBeGreaterThan(1);
  });

  it("validates unique values", () => {
    const result = validateJsonInput(
      '[{"label": "A", "value": "opt1"}, {"label": "B", "value": "opt1"}]',
    );

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("value must be unique");
  });

  it("marks second duplicate as error but first item remains valid", () => {
    const result = validateJsonInput(
      '[{"label": "A", "value": "opt1"}, {"label": "B", "value": "opt1"}]',
    );

    expect(result.validItems).toHaveLength(1);
    expect(result.validItems[0].value).toBe("opt1");
  });

  it("allows duplicate labels but not values", () => {
    const result = validateJsonInput(
      '[{"label": "Option", "value": "a"}, {"label": "Option", "value": "b"}]',
    );

    expect(result.errors).toHaveLength(0);
    expect(result.validItems).toHaveLength(2);
  });

  it("handles null items in array", () => {
    const result = validateJsonInput(
      '[{"label": "France", "value": "fr"}, null, {"label": "Germany", "value": "de"}]',
    );

    expect(result.validItems).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("item cannot be null");
    expect(result.errors[0]).toContain("2");
  });

  it("returns correct line numbers for null items with multiline input", () => {
    const result = validateJsonInput(
      `[
  {"label": "First", "value": "a"},
  null,
  {"label": "Third", "value": "c"}
]`,
    );

    const nullError = result.annotations.find((a) =>
      a.text.includes("cannot be null"),
    );
    expect(nullError).toBeDefined();
    expect(nullError?.row).toBe(3);
  });

  it("validates complex input with multiple errors", () => {
    const result = validateJsonInput(
      `[
  { "label": "foo", "value": "foo1" },
  null,
  { "label": "bar", "value": "bar" },
  { "label": "foo2", "value": "foo1" },
  { "noLabel": "{baz}", "value": "baz" },
  { "label": "{baz}", "noValue": "baz" },
  { "label": { "noLabel": "{baz}", "value": "baz" }, "noValue": "baz" }
]`,
    );

    expect(result.validItems).toHaveLength(2);
    expect(result.validItems[0].labels.default).toBe("foo");
    expect(result.validItems[1].labels.default).toBe("bar");

    expect(result.errors).toHaveLength(6);
    expect(result.errors.some((e) => e.includes("cannot be null"))).toBe(true);
    expect(result.errors.some((e) => e.includes("label is required"))).toBe(
      true,
    );
    expect(result.errors.some((e) => e.includes("value is required"))).toBe(
      true,
    );
    expect(result.errors.some((e) => e.includes("must be unique"))).toBe(true);
  });
});
