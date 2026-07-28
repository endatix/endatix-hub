import { ItemValue } from "survey-core";
import { SurveyCreatorModel } from "survey-creator-core";
import { beforeAll, describe, expect, it } from "vitest";
import { DRAG_CATEGORIZE_TYPE } from "../constants";
import { bindDragCategorizeToCreator } from "../infrastructure/creator-bindings";
import type { DragCategorizeQuestion } from "../infrastructure/drag-categorize-question.model";
import { registerDragCategorizeGlobals } from "../infrastructure/registry";

function createBoundCreator(): SurveyCreatorModel {
  const creator = new SurveyCreatorModel({});
  bindDragCategorizeToCreator(creator);
  creator.JSON = {
    pages: [
      {
        elements: [
          {
            type: DRAG_CATEGORIZE_TYPE,
            name: "q1",
            choices: ["item1"],
            zones: [{ value: "zone1" }],
          },
        ],
      },
    ],
  };
  return creator;
}

function fireItemValueAdded(
  creator: SurveyCreatorModel,
  question: DragCategorizeQuestion,
  propertyName: string,
  newItem: ItemValue,
  itemValues: ItemValue[],
): void {
  creator.onItemValueAdded.fire(creator, {
    element: question,
    propertyName,
    newItem,
    itemValues,
  });
}

describe("bindDragCategorizeToCreator", () => {
  beforeAll(() => {
    registerDragCategorizeGlobals();
  });

  it("renames new zone collection items to zone1..zoneN", () => {
    // Arrange
    const creator = createBoundCreator();
    const question = creator.survey.getQuestionByName(
      "q1",
    ) as unknown as DragCategorizeQuestion;
    const newItem = new ItemValue("item2");

    // Act — mimics the property grid adding a zone row
    fireItemValueAdded(creator, question, "zones", newItem, [
      ...question.zones,
      newItem,
    ]);

    // Assert
    expect(newItem.value).toBe("zone2");
  });

  it("skips the zone1 value when it is already taken", () => {
    // Arrange
    const creator = createBoundCreator();
    const question = creator.survey.getQuestionByName(
      "q1",
    ) as unknown as DragCategorizeQuestion;
    const newItem = new ItemValue("item5");

    // Act
    fireItemValueAdded(creator, question, "zones", newItem, [
      ...question.zones,
      newItem,
    ]);

    // Assert — zone1 exists, so the next free name is zone2
    expect(newItem.value).toBe("zone2");
  });

  it("leaves choices collection items untouched", () => {
    // Arrange
    const creator = createBoundCreator();
    const question = creator.survey.getQuestionByName(
      "q1",
    ) as unknown as DragCategorizeQuestion;
    const newItem = new ItemValue("item2");

    // Act
    fireItemValueAdded(creator, question, "choices", newItem, [
      ...question.choices,
      newItem,
    ]);

    // Assert
    expect(newItem.value).toBe("item2");
  });
});
