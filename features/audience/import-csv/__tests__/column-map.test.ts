import { describe, expect, it } from "vitest";
import {
  AudienceDataType,
  AudienceIdentifierKind,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import {
  choiceColumnGroups,
  mappableColumns,
  propertyColumnMap,
  SKIP_COLUMN,
  suggestColumnMap,
  suggestIdentifierColumn,
} from "../column-map";

function property(
  dataType: AudienceProperty["dataType"],
  variableName: string,
): AudienceProperty {
  return {
    id: variableName,
    formId: "1",
    variableName,
    name: variableName,
    dataType,
    sortOrder: 0,
    dataListId: null,
    choicesJson: null,
    allowsOther: false,
  };
}

const PROPERTIES = [
  property(AudienceDataType.Text, "family_size"),
  property(AudienceDataType.Number, "age"),
  property(AudienceDataType.MultipleChoice, "brands"),
];

describe("suggestIdentifierColumn", () => {
  it("finds the column named like the match key", () => {
    const headers = ["Name", "E-mail", "external_id"];

    expect(suggestIdentifierColumn(headers, AudienceIdentifierKind.Email)).toBe(
      "E-mail",
    );
    expect(
      suggestIdentifierColumn(headers, AudienceIdentifierKind.ExternalId),
    ).toBe("external_id");
  });

  it("suggests nothing rather than guessing", () => {
    expect(
      suggestIdentifierColumn(["Name"], AudienceIdentifierKind.Email),
    ).toBe("");
  });
});

describe("column choices", () => {
  const headers = [
    "email",
    "Family size",
    "family_size",
    "age",
    "brands__nike",
  ];

  it("leaves the identifier and choice columns out of the hand mapping", () => {
    expect(mappableColumns(headers, "email", PROPERTIES)).toEqual([
      "Family size",
      "family_size",
      "age",
    ]);
    expect(choiceColumnGroups(headers, PROPERTIES)).toEqual([
      { property: PROPERTIES[2], columns: ["brands__nike"] },
    ]);
  });

  it("maps each property from the first column named like it", () => {
    const map = suggestColumnMap(
      ["Family size", "family_size", "age"],
      PROPERTIES,
    );

    expect(map).toEqual({
      "Family size": "family_size",
      family_size: SKIP_COLUMN,
      age: "age",
    });
    expect(propertyColumnMap(map)).toEqual({
      family_size: "Family size",
      age: "age",
    });
  });
});
