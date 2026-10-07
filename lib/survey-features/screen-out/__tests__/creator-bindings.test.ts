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
    const creator = new SurveyCreatorModel({});
    creator.JSON = FORM_JSON;

    expect(creator.JSON.triggers).toEqual(FORM_JSON.triggers);
  });

  it("labels choices Creator rendered before onCreatorReady resolved", async () => {
    const creator = new SurveyCreatorModel({ showLogicTab: true });
    creator.JSON = FORM_JSON;
    triggerTypeChoices(creator);

    await screenOutExtension.onCreatorReady?.(creator, deps);

    expect(triggerTypeChoices(creator)).toContainEqual({
      value: SCREEN_OUT_TRIGGER_CLASS,
      text: "Screen out",
    });
  });

  it("adds Screen out to the Logic tab", async () => {
    const creator = new SurveyCreatorModel({ showLogicTab: true });
    creator.JSON = FORM_JSON;
    await screenOutExtension.onCreatorReady?.(creator, deps);

    creator.activeTab = "logic";
    const logic = creator.getPlugin("logic") as unknown as {
      model: SurveyLogic;
    };

    expect(logic.model.getTypeByName("trigger_screenout")?.displayName).toBe(
      "Screen out",
    );
  });

  it("registers the Logic tab action once", () => {
    registerScreenOutCreatorUi();
    registerScreenOutCreatorUi();

    const names = SurveyLogic.types.map((type) => type.name);
    expect(names.filter((name) => name === "trigger_screenout")).toHaveLength(
      1,
    );
  });
});
