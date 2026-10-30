import { describe, expect, it } from "vitest";
import { AudienceDataType } from "@/lib/endatix-api/audience/types";
import {
  choicesError,
  choicesFromText,
  isChoiceType,
  toCreateInput,
} from "../property-draft";

describe("choicesError", () => {
  it.each([
    [[], "Add at least one choice."],
    [["north", " "], "Choices can't be blank."],
    [["north", "south|east"], "A choice can't contain |."],
    [["north", "south", "north"], '"north" is listed twice.'],
  ])("refuses %j as the API does", (choices, message) => {
    // Act & Assert
    expect(choicesError(choices)).toBe(message);
  });

  it("accepts distinct keys, case counting as distinct", () => {
    // Act & Assert
    expect(choicesError(["north", "North", "south"])).toBeNull();
  });
});

describe("choicesFromText", () => {
  it("reads one trimmed key per line, ignoring blank lines before and after", () => {
    // Act
    const choices = choicesFromText("\n  north \r\nsouth\n\n");

    // Assert
    expect(choices).toEqual(["north", "south"]);
  });

  it("keeps a blank line between keys, so the check can name it", () => {
    // Act
    const choices = choicesFromText("north\n\nsouth");

    // Assert
    expect(choices).toEqual(["north", "", "south"]);
    expect(choicesError(choices)).toBe("Choices can't be blank.");
  });
});

describe("toCreateInput", () => {
  it("sends a choice property's keys as a JSON array, with Other", () => {
    // Act
    const input = toCreateInput("7", {
      name: "Region",
      dataType: AudienceDataType.MultipleChoice,
      choices: ["north", "south"],
      allowsOther: true,
    });

    // Assert
    expect(input).toEqual({
      formId: "7",
      name: "Region",
      dataType: AudienceDataType.MultipleChoice,
      choicesJson: '["north","south"]',
      allowsOther: true,
    });
  });

  it("sends no choices and no Other for any other type", () => {
    // Act
    const input = toCreateInput("7", {
      name: "Age",
      dataType: AudienceDataType.Number,
      choices: ["left", "over"],
      allowsOther: true,
    });

    // Assert
    expect(input).toEqual({
      formId: "7",
      name: "Age",
      dataType: AudienceDataType.Number,
      choicesJson: null,
      allowsOther: false,
    });
  });
});

describe("isChoiceType", () => {
  it("is true only for single and multiple choice", () => {
    // Act & Assert
    expect(isChoiceType(AudienceDataType.SingleChoice)).toBe(true);
    expect(isChoiceType(AudienceDataType.MultipleChoice)).toBe(true);
    expect(isChoiceType(AudienceDataType.Text)).toBe(false);
  });
});
