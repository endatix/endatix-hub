import { describe, expect, it } from "vitest";
import { AudienceDataType } from "@/lib/endatix-api/audience/types";
import {
  candidateVariables,
  checkDraftName,
  draftOf,
  type VariableHolder,
} from "../new-properties";

const holders = (held: Record<string, VariableHolder>) => (variable: string) =>
  held[variable] ?? null;

describe("draftOf", () => {
  it("names the property after a tidied heading, typed as its values suggest", () => {
    const draft = draftOf("region_code", ["NTH", "STH", "NTH"]);

    expect(draft).toMatchObject({
      column: "region_code",
      name: "Region code",
      dataType: AudienceDataType.SingleChoice,
    });
    expect(draftOf("  first-name ", []).name).toBe("First name");
  });
});

describe("checkDraftName", () => {
  it("passes a name whose variable nothing holds", () => {
    expect(checkDraftName("Segment", holders({}))).toEqual({
      variableName: "segment",
      invalid: false,
      holder: null,
      suggestedName: null,
      readBy: null,
    });
  });

  it("warns when a question holds the variable and suggests the first free name", () => {
    const held = holders({ segment: "question", segment_2: "property" });

    expect(checkDraftName("Segment", held)).toEqual({
      variableName: "segment",
      invalid: false,
      holder: "question",
      suggestedName: "Segment 3",
      readBy: null,
    });
  });

  it("suggests nothing past the names it could check", () => {
    const held = holders(
      Object.fromEntries(
        candidateVariables("Segment").map((v) => [v, "column"]),
      ),
    );

    expect(checkDraftName("Segment", held).suggestedName).toBeNull();
  });

  it("refuses a name with no letter or digit, which the API cannot turn into a variable", () => {
    expect(checkDraftName("  ", holders({})).invalid).toBe(true);
    expect(checkDraftName("Ålder", holders({})).invalid).toBe(false);
  });

  it("holds a group's name to the variable its columns are read by, and suggests no other", () => {
    // Arrange
    const held = holders({ brands: "question" });

    // Act
    const renamed = checkDraftName("Brand list", holders({}), "brands");
    const kept = checkDraftName("Brands", held, "brands");

    // Assert
    expect(renamed).toMatchObject({ invalid: true, readBy: "brands" });
    expect(kept).toMatchObject({
      invalid: false,
      holder: "question",
      suggestedName: null,
      readBy: null,
    });
  });
});

describe("candidateVariables", () => {
  it("lists the variable and the suffixed ones a suggestion may take", () => {
    expect(candidateVariables("Region code").slice(0, 3)).toEqual([
      "region_code",
      "region_code_2",
      "region_code_3",
    ]);
  });
});
