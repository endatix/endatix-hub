import { describe, expect, it } from "vitest";
import { AudienceDataType } from "@/lib/endatix-api/audience/types";
import { suggestDataType } from "../type-suggestion";

const typeOf = (values: string[]) => suggestDataType(values).dataType;

describe("suggestDataType", () => {
  it("suggests number when every value is a number the API takes", () => {
    expect(typeOf(["12", "-4.5", "1e3", "", "480"])).toBe(
      AudienceDataType.Number,
    );
    expect(typeOf(["1,200", "15"])).toBe(AudienceDataType.Text);
  });

  it("suggests date only for real YYYY-MM-DD dates", () => {
    expect(typeOf(["2025-01-02", "2024-02-29", "2023-12-31"])).toBe(
      AudienceDataType.Date,
    );
    expect(typeOf(["2025-02-30", "2025-01-02", "2025-03-04"])).toBe(
      AudienceDataType.Text,
    );
  });

  it("never suggests date for a date whose order is ambiguous", () => {
    const values = ["11/04/25", "03/05/25", "12/06/25", "01/07/25"];

    expect(typeOf(values)).toBe(AudienceDataType.Text);
  });

  it("suggests date and time for ISO date-times", () => {
    expect(
      typeOf([
        "2025-01-02T09:30",
        "2025-01-02T09:30:15Z",
        "2025-01-02T23:59:59.5+02:00",
      ]),
    ).toBe(AudienceDataType.DateTime);
    expect(typeOf(["2025-01-02 09:30", "2025-01-03 10:00"])).toBe(
      AudienceDataType.Text,
    );
  });

  it("suggests boolean only for true and false as the API writes them", () => {
    expect(typeOf(["true", "false", "true"])).toBe(AudienceDataType.Boolean);
    expect(typeOf(["TRUE", "FALSE", "TRUE"])).not.toBe(
      AudienceDataType.Boolean,
    );
  });

  it("suggests single choice for a few values that repeat, with them as choices", () => {
    const suggestion = suggestDataType(["A", "B", "A", "C", "B"]);

    expect(suggestion).toEqual({
      dataType: AudienceDataType.SingleChoice,
      values: ["A", "B", "C"],
      reason: "3 distinct values",
      choices: ["A", "B", "C"],
    });
  });

  it("suggests text when values do not repeat or are too many to choose from", () => {
    expect(typeOf(["Alex", "Rae", "Tom"])).toBe(AudienceDataType.Text);
    const many = Array.from({ length: 22 }, (_, i) => `v${i % 11}`);
    expect(typeOf(many)).toBe(AudienceDataType.Text);
  });

  it("offers no choices a choice key cannot hold", () => {
    const suggestion = suggestDataType(["a|b", "c", "a|b", "c"]);

    expect(suggestion.dataType).toBe(AudienceDataType.Text);
    expect(suggestion.choices).toBeNull();
  });

  it("shows the evidence behind each suggestion", () => {
    expect(suggestDataType(["12", "480", "12", "7"])).toMatchObject({
      values: ["12", "480", "7"],
      reason: "All numbers",
    });
    expect(suggestDataType(["Alex", "Rae", "Tom", "Ann"]).reason).toBe(
      "4 distinct values",
    );
  });

  it("suggests text for a column with no values, and says so", () => {
    expect(suggestDataType(["", " "])).toEqual({
      dataType: AudienceDataType.Text,
      values: [],
      reason: "No values in the file",
      choices: null,
    });
  });
});
