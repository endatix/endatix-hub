import { describe, expect, it } from "vitest";
import { AudienceDataType } from "@/lib/endatix-api/audience/types";
import type { AudienceProperty } from "@/lib/endatix-api/audience/types";
import { importableProperties, propertyColumnMap, SKIP_COLUMN } from "../column-map";

function property(dataType: AudienceProperty["dataType"], variableName: string): AudienceProperty {
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

describe("column map", () => {
  it("leaves choice properties out of the mapping", () => {
    const mapped = importableProperties([
      property(AudienceDataType.Text, "city"),
      property(AudienceDataType.SingleChoice, "role"),
    ]);

    expect(mapped.map((item) => item.variableName)).toEqual(["city"]);
  });

  it("drops columns the operator skipped", () => {
    expect(propertyColumnMap({ city: "City", score: SKIP_COLUMN })).toEqual({
      city: "City",
    });
  });
});
