import { describe, expect, it } from "vitest";
import {
  AudienceDataType,
  AudienceIdentifierKind,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import {
  choiceColumnGroups,
  columnTally,
  CREATE_COLUMN,
  mappableColumns,
  newChoiceGroups,
  propertyColumnMap,
  SKIP_COLUMN,
  columnsAfterIdentifierChange,
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

  it("queues a column no property is named like for a new property", () => {
    const map = suggestColumnMap(["age", "segment", "brands"], PROPERTIES);

    expect(map).toEqual({
      age: "age",
      segment: CREATE_COLUMN,
      brands: SKIP_COLUMN,
    });
    expect(propertyColumnMap(map)).toEqual({ age: "age" });
  });

  it("counts the columns mapped, to create and ignored", () => {
    const map = { age: "age", segment: CREATE_COLUMN, notes: SKIP_COLUMN };

    expect(columnTally(["age", "segment", "notes", "region"], map)).toEqual({
      mapped: 1,
      toCreate: 1,
      ignored: 2,
    });
  });

  it("keeps a property whose variable name is skip", () => {
    expect(propertyColumnMap({ notes: "skip" })).toEqual({ skip: "notes" });
  });

  it("suggests a decision for the column an identifier change releases", () => {
    // Arrange
    const columns = suggestColumnMap(["age", "notes"], PROPERTIES);

    // Act
    const next = columnsAfterIdentifierChange(columns, "age", {
      headers: ["email", "age", "notes"],
      properties: PROPERTIES,
    });

    // Assert
    expect(next.age).toBe(SKIP_COLUMN);
    expect(next.email).toBe(CREATE_COLUMN);
    expect(next.notes).toBe(CREATE_COLUMN);
  });
});

describe("new choice groups", () => {
  const headers = [
    "email",
    "age",
    "Shops__online",
    "shops__mall",
    "shops__other",
    "shops__other_text",
    "brands__nike",
    "notes",
  ];

  it("groups the __ columns of a variable no property has, choices in file order and Other set aside", () => {
    expect(newChoiceGroups(headers, "email", PROPERTIES)).toEqual([
      {
        key: "shops__",
        variable: "shops",
        columns: [
          "Shops__online",
          "shops__mall",
          "shops__other",
          "shops__other_text",
        ],
        choices: ["online", "mall"],
        allowsOther: true,
      },
    ]);
  });

  it("shows a group as one row where its first column was, and counts it once", () => {
    // Act
    const rows = mappableColumns(headers, "email", PROPERTIES);
    const map = suggestColumnMap(rows, PROPERTIES);

    // Assert
    expect(rows).toEqual(["age", "shops__", "notes"]);
    expect(map["shops__"]).toBe(CREATE_COLUMN);
    expect(columnTally(rows, map)).toEqual({
      mapped: 1,
      toCreate: 2,
      ignored: 0,
    });
    expect(propertyColumnMap(map)).toEqual({ age: "age" });
  });

  it("leaves columns as they are when they cannot make a multiple-choice property", () => {
    // Arrange
    const loose = [
      "email",
      "solo__one",
      "my brand__a",
      "my brand__b",
      "age__a",
      "age__b",
      "x__other",
      "x__other_text",
      "p__a|b",
      "p__c",
      "dup__a",
      "dup__A",
      "e__",
      "e__b",
    ];

    // Act
    const groups = newChoiceGroups(loose, "email", PROPERTIES);
    const rows = mappableColumns(loose, "email", PROPERTIES);

    // Assert
    expect(groups).toEqual([]);
    expect(rows).toEqual(loose.slice(1));
  });

  it("maps a real column whose name ends like a group's by hand", () => {
    // Arrange
    const byHand = { "x__*": "age", x__: "notes" };

    // Act
    const suggested = suggestColumnMap(["Age__*"], PROPERTIES);
    const sent = propertyColumnMap(byHand);

    // Assert
    expect(suggested).toEqual({ "Age__*": "age" });
    expect(sent).toEqual({ age: "x__*", notes: "x__" });
  });

  it("gives a group that an identifier change forms its suggestion, and drops its columns' own decisions", () => {
    // Arrange
    const headers = ["email", "shops__a", "shops__b", "notes"];
    const columns = {
      ...suggestColumnMap(mappableColumns(headers, "shops__a", []), []),
      shops__b: "age",
    };

    // Act
    const next = columnsAfterIdentifierChange(columns, "email", {
      headers,
      properties: [],
    });

    // Assert
    expect(mappableColumns(headers, "email", [])).toEqual(["shops__", "notes"]);
    expect(next["shops__"]).toBe(CREATE_COLUMN);
    expect(Object.keys(next).sort()).toEqual(["email", "notes", "shops__"]);
    expect(propertyColumnMap(next)).toEqual({});
  });

  it("gives the column a group leaves when an identifier change breaks it its suggestion", () => {
    // Arrange
    const headers = ["email", "shops__a", "shops__b", "notes"];
    const columns = suggestColumnMap(mappableColumns(headers, "email", []), []);

    // Act
    const next = columnsAfterIdentifierChange(columns, "shops__a", {
      headers,
      properties: [],
    });

    // Assert
    expect(mappableColumns(headers, "shops__a", [])).toEqual([
      "email",
      "shops__b",
      "notes",
    ]);
    expect(next.shops__b).toBe(CREATE_COLUMN);
    expect(next.email).toBe(CREATE_COLUMN);
  });

  it("leaves the identifier out of a group", () => {
    // Arrange
    const headers = ["shops__a", "shops__b", "shops__c"];

    // Act
    const groups = newChoiceGroups(headers, "shops__a", []);

    // Assert
    expect(groups[0]?.columns).toEqual(["shops__b", "shops__c"]);
  });
});
