import { describe, expect, it } from "vitest";
import type { ItemValue, QuestionMatrixDynamicModel } from "survey-core";
import { SurveyCreatorModel, SurveyLogic } from "survey-creator-core";
import { SCREEN_OUT_TRIGGER_CLASS } from "../constants";
import { registerScreenOutCreatorUi } from "../infrastructure/creator-bindings";
import { screenOutExtension } from "../infrastructure/screen-out.extension";

const FORM_JSON = {
  pages: [{ name: "p1", elements: [{ type: "text", name: "age" }] }],
  triggers: [{ type: "screenout", expression: "{age} < 18" }],
};

const deps = { getRuntimeState: () => ({}) };

function triggerTypeChoices(creator: SurveyCreatorModel) {
  creator.selectElement(creator.survey);
  const matrix = creator.propertyGrid.getQuestionByName(
    "triggers",
  ) as QuestionMatrixDynamicModel;
  const typeCell = matrix.visibleRows[0].cells[0].question;
  return typeCell.choices.map((choice: ItemValue) => ({
    value: choice.value,
    text: choice.text,
  }));
}

describe("screen-out Creator bindings", () => {
  it("keeps a stored screen-out trigger when Creator loads the form", () => {
    // Arrange & Act
    const creator = new SurveyCreatorModel({});
    creator.JSON = FORM_JSON;

    // Assert
    expect(creator.JSON.triggers).toEqual(FORM_JSON.triggers);
  });

  it("labels choices Creator rendered before onCreatorReady resolved", async () => {
    // Arrange
    const creator = new SurveyCreatorModel({ showLogicTab: true });
    creator.JSON = FORM_JSON;
    triggerTypeChoices(creator);

    // Act
    await screenOutExtension.onCreatorReady?.(creator, deps);

    // Assert
    expect(triggerTypeChoices(creator)).toContainEqual({
      value: SCREEN_OUT_TRIGGER_CLASS,
      text: "Screen out",
    });
  });

  it("adds Screen out to the Logic tab", async () => {
    // Arrange
    const creator = new SurveyCreatorModel({ showLogicTab: true });
    creator.JSON = FORM_JSON;

    // Act
    await screenOutExtension.onCreatorReady?.(creator, deps);
    creator.activeTab = "logic";
    const logic = creator.getPlugin("logic") as unknown as {
      model: SurveyLogic;
    };

    // Assert
    expect(logic.model.getTypeByName("trigger_screenout")?.displayName).toBe(
      "Screen out",
    );
  });

  it("shows a screen-out rule only as Screen out, not also as Complete survey", async () => {
    // Arrange
    const creator = new SurveyCreatorModel({ showLogicTab: true });
    creator.JSON = FORM_JSON;
    await screenOutExtension.onCreatorReady?.(creator, deps);

    // Act
    creator.activeTab = "logic";
    const logic = creator.getPlugin("logic") as unknown as {
      model: SurveyLogic;
    };

    // Assert
    const actionTypes = logic.model.items[0].actions.map(
      (action) => action.logicTypeName,
    );
    expect(actionTypes).toEqual(["trigger_screenout"]);
  });

  it("registers the Logic tab action once", () => {
    // Act
    registerScreenOutCreatorUi();
    registerScreenOutCreatorUi();

    // Assert
    const names = SurveyLogic.types.map((type) => type.name);
    expect(names.filter((name) => name === "trigger_screenout")).toHaveLength(
      1,
    );
  });
});
