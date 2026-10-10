import { describe, expect, it } from "vitest";
import { AudienceDataType } from "@/lib/endatix-api/audience/types";
import {
  AUDIENCE_DATA_TYPES,
  CREATABLE_DATA_TYPES,
  dataTypeLabel,
  variableNameFromName,
} from "../property-types";

describe("audience data types", () => {
  it("leaves choice types out of the create list until choices can be edited", () => {
    // Act
    const creatable = CREATABLE_DATA_TYPES.map((entry) => entry.value);

    // Assert
    expect(creatable).not.toContain(AudienceDataType.SingleChoice);
    expect(creatable).not.toContain(AudienceDataType.MultipleChoice);
    expect(creatable).toHaveLength(AUDIENCE_DATA_TYPES.length - 2);
  });

  it("still labels existing choice properties", () => {
    // Act & Assert
    expect(dataTypeLabel(AudienceDataType.MultipleChoice)).toBe(
      "Multiple choice",
    );
  });
});

describe("variableNameFromName", () => {
  it.each([
    ["First Name!", "first_name"],
    ["  Age  ", "age"],
    ["Q1__Score", "q1_score"],
    ["Град", ""],
  ])("turns %j into %j, as the API does", (name, expected) => {
    // Act & Assert
    expect(variableNameFromName(name)).toBe(expected);
  });
});
