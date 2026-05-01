import { describe, expect, it } from "vitest";
import { parseAndValidateJson } from "../types";

describe("parseAndValidateJson", () => {
  it("returns error for empty input", () => {
    const result = parseAndValidateJson("");

    expect(result.validItems).toEqual([]);
    expect(result.errors).toContain("JSON content is required.");
    expect(result.annotations).toHaveLength(1);
    expect(result.annotations[0].type).toBe("error");
  });

  it("returns error for invalid JSON", () => {
    const result = parseAndValidateJson("{ invalid }");

    expect(result.validItems).toEqual([]);
    expect(result.errors).toContain("Invalid JSON format.");
    expect(result.annotations[0].text).toBe("Invalid JSON format.");
  });

  it("returns error when root is not array", () => {
    const result = parseAndValidateJson('{"key": "value"}');

    expect(result.validItems).toEqual([]);
    expect(result.errors).toContain("JSON root must be an array of objects.");
  });

  it("returns error for empty array", () => {
    const result = parseAndValidateJson("[]");

    expect(result.validItems).toEqual([]);
    expect(result.errors).toContain("At least one item is required.");
  });

  it("validates items and returns structured annotations", () => {
    const result = parseAndValidateJson(
      '[{"label": "Option 1", "value": "opt1"}, {"value": "opt2"}]',
    );

    expect(result.validItems).toHaveLength(1);
    expect(result.validItems[0]).toEqual({ label: "Option 1", value: "opt1" });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("label is required");

    expect(result.annotations).toHaveLength(1);
    expect(result.annotations[0].text).toContain("label is required");
  });

  it("returns valid items with all required fields", () => {
    const result = parseAndValidateJson(
      '[{"label": "A", "value": "a"}, {"label": "B", "value": "b"}]',
    );

    expect(result.validItems).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.annotations).toHaveLength(0);
  });

  it("validates field length constraints", () => {
    const longLabel = "x".repeat(256);
    const result = parseAndValidateJson(
      `[{"label": "${longLabel}", "value": "a"}]`,
    );

    expect(result.errors.some((e) => e.includes("exceeds 255"))).toBe(true);
    expect(result.annotations.some((a) => a.text.includes("exceeds 255"))).toBe(
      true,
    );
  });

it("uses row indexing accounting for array bracket", () => {
    const result = parseAndValidateJson(
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
    const result = parseAndValidateJson(multilineJson);

    const missingLabelError = result.annotations.find((a) =>
      a.text.includes("label is required"),
    );
    expect(missingLabelError).toBeDefined();
    expect(missingLabelError?.row).toBeGreaterThan(1);
  });

  it("validates unique values", () => {
    const result = parseAndValidateJson(
      '[{"label": "A", "value": "opt1"}, {"label": "B", "value": "opt1"}]',
    );

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("value must be unique");
  });

  it("marks second duplicate as error but first item remains valid", () => {
    const result = parseAndValidateJson(
      '[{"label": "A", "value": "opt1"}, {"label": "B", "value": "opt1"}]',
    );

    expect(result.validItems).toHaveLength(1);
    expect(result.validItems[0].value).toBe("opt1");
  });

  it("allows duplicate labels but not values", () => {
    const result = parseAndValidateJson(
      '[{"label": "Option", "value": "a"}, {"label": "Option", "value": "b"}]',
    );

    expect(result.errors).toHaveLength(0);
    expect(result.validItems).toHaveLength(2);
  });
});
