import { beforeEach, describe, expect, it } from "vitest";
import {
  Helpers,
  ItemValue,
  QuestionMatrixDynamicModel,
  QuestionSelectBase,
  Serializer,
  SurveyModel,
} from "survey-core";
import { SurveyCreatorModel } from "survey-creator-core";
import addRandomizeGroupFeature from "../features/group-randomization";

describe("Randomize checkbox in the choices editor", () => {
  beforeEach(() => {
    addRandomizeGroupFeature();
  });

  function radiogroupChoice(choicesOrder: string): ItemValue {
    const survey = new SurveyModel({
      elements: [
        {
          type: "radiogroup",
          name: "q1",
          choicesOrder,
          choices: ["a"],
        },
      ],
    });
    const question = survey.getQuestionByName("q1");
    if (!(question instanceof QuestionSelectBase)) {
      throw new Error("Expected a choice question");
    }
    return question.choices[0];
  }

  it("shows itemvalue.randomize as a column only while choice order is random", () => {
    // Arrange
    const randomizeProperty = Serializer.findProperty("itemvalue", "randomize");
    const randomChoice = radiogroupChoice("random");
    const orderedChoice = radiogroupChoice("none");

    // Act
    const visibleWhenRandom = randomizeProperty?.visibleIf(randomChoice);
    const visibleWhenOrdered = randomizeProperty?.visibleIf(orderedChoice);

    // Assert
    expect(randomizeProperty?.visible).toBe(true);
    expect(randomizeProperty?.locationInTable).toBe("column");
    expect(visibleWhenRandom).toBe(true);
    expect(visibleWhenOrdered).toBe(false);
  });

  it("places group in the choices table column", () => {
    // Arrange
    const groupProperty = Serializer.findProperty("itemvalue", "group");

    // Act & Assert
    expect(groupProperty?.locationInTable).toBe("column");
  });

  it("leaves the question-level randomize property hidden", () => {
    // Arrange
    const questionRandomize = Serializer.findProperty("question", "randomize");

    // Act & Assert
    expect(questionRandomize?.visible).toBe(false);
  });

  function choicesColumnNames(choicesOrder?: string): string[] {
    const creator = new SurveyCreatorModel({});
    const element: {
      type: string;
      name: string;
      choices: string[];
      choicesOrder?: string;
    } = {
      type: "radiogroup",
      name: "q1",
      choices: ["a", "b"],
    };
    if (choicesOrder) {
      element.choicesOrder = choicesOrder;
    }
    creator.JSON = { elements: [element] };
    creator.selectElement(creator.survey.getQuestionByName("q1"));
    const choices = creator.propertyGrid.getQuestionByName(
      "choices",
    ) as QuestionMatrixDynamicModel;
    // visibleColumns is built from the row objects and stays ["value", "text"]
    // until visibleRows is read.
    void choices.visibleRows.length;
    return choices.visibleColumns.map((column) => column.name);
  }

  it("adds the randomize column to the choices table when choice order is random", () => {
    // Act
    const columns = choicesColumnNames("random");

    // Assert
    expect(columns).toContain("randomize");
    expect(columns).toContain("group");
  });

  it("keeps the choices table to value and text when choice order is unset", () => {
    // Act & Assert
    expect(choicesColumnNames()).toEqual(["value", "text"]);
  });
});

describe("Per-item pin inside a group", () => {
  const PIN_SEEDS = [11, 22, 33, 44, 55, 66];

  function groupedChoice(value: string, randomize: boolean): ItemValue {
    const item = new ItemValue(value);
    item.randomize = randomize;
    item.setPropertyValue("group", "A");
    return item;
  }

  beforeEach(() => {
    addRandomizeGroupFeature();
  });

  it("keeps a pinned choice in place and still shuffles the rest of its group", () => {
    // Act - core leaves randomize === false items at their index. This fails
    // if a survey-core upgrade shuffles those slots too.
    const orders = PIN_SEEDS.map((seed) =>
      Helpers.randomizeArray(
        [
          groupedChoice("a1", false),
          groupedChoice("a2", true),
          groupedChoice("a3", true),
          groupedChoice("a4", true),
        ],
        seed,
      ).map((item) => String(item.value)),
    );

    // Assert
    orders.forEach((order) => expect(order[0]).toBe("a1"));
    expect(
      new Set(orders.map((order) => order.slice(1).join(","))).size,
    ).toBeGreaterThan(1);
  });
});
