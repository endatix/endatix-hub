import { describe, expect, it } from "vitest";
import {
  AudienceDataType,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import {
  changedValues,
  choiceKeysOf,
  formatPropertyValue,
  variableNameFromName,
} from "../utils";

function property(
  dataType: AudienceDataType,
  choicesJson?: string,
): AudienceProperty {
  return {
    id: "p1",
    formId: "f1",
    variableName: "plan",
    name: "Plan",
    dataType,
    sortOrder: 0,
    choicesJson: choicesJson ?? null,
    allowsOther: false,
  };
}

describe("variableNameFromName", () => {
  it.each([
    ["First Name!", "first_name"],
    ["  Age  ", "age"],
    ["Q1__Score", "q1_score"],
    ["Град", ""],
  ])("turns %j into %j, as the API does", (name, expected) => {
    expect(variableNameFromName(name)).toBe(expected);
  });
});

describe("formatPropertyValue", () => {
  it("leaves an unset value undefined so the cell can say Not set", () => {
    expect(
      formatPropertyValue(property(AudienceDataType.Text), undefined),
    ).toBeUndefined();
    expect(
      formatPropertyValue(property(AudienceDataType.Text), ""),
    ).toBeUndefined();
  });

  it("reads booleans, date-times and multiple choices as words", () => {
    expect(
      formatPropertyValue(property(AudienceDataType.Boolean), "true"),
    ).toBe("Yes");
    expect(
      formatPropertyValue(
        property(AudienceDataType.DateTime),
        "2026-10-05T09:30",
      ),
    ).toBe("2026-10-05 09:30");
    expect(
      formatPropertyValue(
        property(AudienceDataType.MultipleChoice),
        '["a","b"]',
      ),
    ).toBe("a, b");
  });
});

describe("changedValues", () => {
  it("keeps only changed values, trimmed, and an emptied one as a clear", () => {
    expect(
      changedValues(
        { a: "1", b: "x", c: "same" },
        { a: " 2 ", b: "", c: "same", d: "" },
      ),
    ).toEqual({ a: "2", b: "" });
  });
});

describe("choiceKeysOf", () => {
  it("reads the keys, and nothing from missing or broken JSON", () => {
    expect(
      choiceKeysOf(property(AudienceDataType.SingleChoice, '["basic","pro"]')),
    ).toEqual(["basic", "pro"]);
    expect(choiceKeysOf(property(AudienceDataType.SingleChoice, "{"))).toEqual(
      [],
    );
    expect(choiceKeysOf(property(AudienceDataType.Text))).toEqual([]);
  });
});
