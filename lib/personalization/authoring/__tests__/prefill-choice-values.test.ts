import { describe, expect, it } from "vitest";
import type { QuestionSelectBase } from "survey-core";
import { SurveyCreatorModel } from "survey-creator-core";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { bindAudienceToCreator } from "..";

const SCORE = {
  type: "dropdown",
  name: "score",
  title: "Score",
  choices: ["1", "2", "3", "4", "5", "6", "7", "8"],
  prefillTargets: [{ type: "dropdown" }, { type: "radiogroup" }, { type: "buttongroup" }],
};
const TOPICS = {
  type: "checkbox",
  name: "topics",
  title: "Topics",
  choices: ["1", "2", "5"],
  prefillTargets: [{ type: "checkbox" }, { type: "tagbox" }],
};

function variables(values: unknown[], variable: string): AudienceVariables {
  const presets = values.map((value, index) => ({
    name: `p${index + 1}`,
    variables: { [variable]: value },
  }));
  return {
    variablePresets: {
      definition: { elements: [SCORE, TOPICS] },
      presets,
      totalPresets: presets.length,
    },
    coverage: { participants: { test: presets.length, real: 0 }, properties: [] },
    editing: { allowAdd: false, allowEdit: false, allowDelete: false },
    readOnlyPresets: [],
  };
}

function designer(json: object, values: unknown[], variable = "score") {
  const creator = new SurveyCreatorModel({});
  creator.JSON = json;
  const read = variables(values, variable);
  bindAudienceToCreator(creator, {
    variables: read,
    refresh: () => Promise.resolve(Result.success(read)),
  });
  return creator;
}

type Warning = { isVisible: boolean; html: string };

function open(creator: SurveyCreatorModel, name: string) {
  const question = creator.survey.getQuestionByName(name) as QuestionSelectBase;
  creator.selectElement(question);
  const grid = creator.propertyGrid;
  return {
    question,
    prefill: grid.getQuestionByName("edxPrefillFrom"),
    warning: () => grid.getQuestionByName("edxPrefillFrom_values") as unknown as Warning | null,
  };
}

function shown(warning: Warning | null): string | undefined {
  return warning?.isVisible ? warning.html : undefined;
}

const DEFAULT_CHOICES = ["Item 1", "Item 2", "Item 3"];

describe("Prefill from on a choice question", () => {
  it("names, in order, the participants' values that no choice has", () => {
    // Arrange
    const creator = designer(
      { elements: [{ type: "radiogroup", name: "rating", choices: DEFAULT_CHOICES }] },
      ["8", "1", "2", "2", "Item 1"],
    );

    // Act
    const rating = open(creator, "rating");
    rating.prefill!.value = "score";

    // Assert
    const text = shown(rating.warning());
    expect(text).toContain("No choice has the value 1, 2 or 8.");
    expect(text).toContain("Score");
  });

  it("shows nothing when every participant's value has a choice", () => {
    // Arrange
    const creator = designer(
      {
        elements: [
          {
            type: "dropdown",
            name: "rating",
            choices: [1, 2, 3],
            defaultValueExpression: "{score}",
          },
        ],
      },
      [1, "2", 3, null, ""],
    );

    // Act
    const rating = open(creator, "rating");

    // Assert
    expect(shown(rating.warning())).toBeUndefined();
  });

  it("checks each value a multiple-choice participant holds", () => {
    // Arrange
    const creator = designer(
      {
        elements: [
          {
            type: "checkbox",
            name: "picked",
            choices: [1, 2],
            defaultValueExpression: "{topics}",
          },
        ],
      },
      [["1", "2"], ["2", "5"]],
      "topics",
    );

    // Act
    const picked = open(creator, "picked");

    // Assert
    expect(shown(picked.warning())).toContain("No choice has the value 5.");
  });

  it("lists the first five values and counts the rest", () => {
    // Arrange
    const creator = designer(
      {
        elements: [
          {
            type: "radiogroup",
            name: "rating",
            choices: DEFAULT_CHOICES,
            defaultValueExpression: "{score}",
          },
        ],
      },
      ["1", "2", "3", "4", "5", "6", "7", "8"],
    );

    // Act
    const rating = open(creator, "rating");

    // Assert
    expect(shown(rating.warning())).toContain("No choice has the value 1, 2, 3, 4, 5 or 3 other values.");
  });

  it("clears the warning once the choices cover the values, or the prefill is cleared", () => {
    // Arrange
    const creator = designer(
      {
        elements: [
          { type: "radiogroup", name: "rating", choices: [1], defaultValueExpression: "{score}" },
          { type: "text", name: "plain", inputType: "number", defaultValueExpression: "{score}" },
        ],
      },
      ["1", "2"],
    );
    const rating = open(creator, "rating");
    expect(shown(rating.warning())).toContain("No choice has the value 2.");

    // Act
    rating.question.choices = [1, 2];
    const covered = shown(open(creator, "rating").warning());
    rating.question.choices = [1];
    open(creator, "rating").prefill!.value = undefined;
    const cleared = shown(open(creator, "rating").warning());
    const plain = shown(open(creator, "plain").warning());

    // Assert
    expect(covered).toBeUndefined();
    expect(cleared).toBeUndefined();
    expect(plain).toBeUndefined();
  });
});
