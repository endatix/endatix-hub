import { describe, expect, it } from "vitest";
import {
  AudienceDataType,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import {
  changedValues,
  choiceKeysOf,
  formatPropertyValue,
  fromLocalDateTimeInput,
  parseKeyArray,
  toLocalDateTimeInput,
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
        "2026-10-05T09:30Z",
      ),
    ).toBe(toLocalDateTimeInput("2026-10-05T09:30Z").replace("T", " "));
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

describe("changedValues with stray spaces", () => {
  it("does not rewrite a stored value whose only difference is surrounding spaces", () => {
    // Act
    const changes = changedValues({ a: "Sales " }, { a: "Sales " });

    // Assert
    expect(changes).toEqual({});
  });
});

describe("date-time input", () => {
  const wall = (iso: string) => {
    const d = new Date(iso);
    return [
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
    ];
  };

  it("sends the reader's wall time with their offset, so the instant is kept", () => {
    // Act
    const sent = fromLocalDateTimeInput("2026-03-01T09:00");

    // Assert
    expect(sent).toMatch(/^2026-03-01T09:00[+-]\d{2}:\d{2}$/);
    expect(new Date(sent).getTime()).toBe(new Date(2026, 2, 1, 9, 0).getTime());
  });

  it("shows a stored instant in the reader's time zone", () => {
    // Act
    const shown = toLocalDateTimeInput("2026-03-01T09:00:00+02:00");

    // Assert
    expect(wall(shown)).toEqual(wall("2026-03-01T07:00:00Z"));
  });

  it("reads a stored value with no offset as UTC, as the API does", () => {
    // Act & Assert
    expect(toLocalDateTimeInput("2026-03-01T09:00")).toBe(
      toLocalDateTimeInput("2026-03-01T09:00Z"),
    );
  });

  it("round-trips an edit without moving the instant", () => {
    // Arrange
    const stored = "2026-03-01T09:00:00+02:00";

    // Act
    const resent = fromLocalDateTimeInput(toLocalDateTimeInput(stored));

    // Assert
    expect(new Date(resent).getTime()).toBe(new Date(stored).getTime());
  });

  it("is empty for an unreadable or empty value", () => {
    // Act & Assert
    expect(toLocalDateTimeInput("not a date")).toBe("");
    expect(fromLocalDateTimeInput("")).toBe("");
  });
});

describe("parseKeyArray", () => {
  it("reads a JSON array of keys and nothing else", () => {
    // Act & Assert
    expect(parseKeyArray('["a",2]')).toEqual(["a", "2"]);
    expect(parseKeyArray('{"a":1}')).toBeUndefined();
    expect(parseKeyArray("{")).toBeUndefined();
    expect(parseKeyArray(null)).toBeUndefined();
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
