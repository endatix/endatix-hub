import { describe, expect, it } from "vitest";
import type { SurveyModel } from "survey-core";
import { SurveyCreatorModel, type TabTestPlugin } from "survey-creator-core";
import { disposeReplacedSurveys } from "../use-cases/dispose-replaced-surveys";

const FORM_JSON = {
  elements: [
    { type: "boolean", name: "consent" },
    { type: "file", name: "photo" },
    { type: "imagepicker", name: "pick", choices: [] },
  ],
};

function designer() {
  const creator = new SurveyCreatorModel({
    showPreview: true,
    showThemeTab: true,
  });
  creator.JSON = FORM_JSON;
  return creator;
}

function preview(creator: SurveyCreatorModel) {
  return creator.getPlugin("preview") as TabTestPlugin;
}

function previewSurvey(creator: SurveyCreatorModel): SurveyModel {
  return preview(creator).model.survey;
}

/** What survey-react-ui does once a model is on screen. */
function render(survey: SurveyModel): void {
  survey.afterRenderSurvey(document.createElement("div"));
}

describe("disposeReplacedSurveys", () => {
  it("disposes the Preview survey that Test again replaced, once the new one renders", () => {
    const creator = designer();
    disposeReplacedSurveys(creator);
    creator.activeTab = "preview";
    const first = previewSurvey(creator);
    render(first);

    preview(creator).model.testAgain();
    const second = previewSurvey(creator);

    expect(second).not.toBe(first);
    expect(first.isDisposed).toBe(false);
    render(second);
    expect(first.isDisposed).toBe(true);
    expect(second.isDisposed).toBe(false);
  });

  it("disposes the questions of the replaced survey, so their resize observers stop", () => {
    const creator = designer();
    disposeReplacedSurveys(creator);
    creator.activeTab = "preview";
    const first = previewSurvey(creator);
    render(first);
    const questions = first.getAllQuestions();

    preview(creator).model.testAgain();
    render(previewSurvey(creator));

    expect(questions.map((q) => q.isDisposed)).toEqual([true, true, true]);
  });

  it("disposes every survey replaced before the latest one rendered", () => {
    const creator = designer();
    disposeReplacedSurveys(creator);
    creator.activeTab = "preview";
    const first = previewSurvey(creator);
    render(first);

    preview(creator).model.testAgain();
    const skipped = previewSurvey(creator);
    preview(creator).model.testAgain();
    render(previewSurvey(creator));

    expect([first.isDisposed, skipped.isDisposed]).toEqual([true, true]);
  });

  it("keeps the Test again bar the Creator shares between Preview surveys", () => {
    const creator = designer();
    disposeReplacedSurveys(creator);
    creator.activeTab = "preview";
    render(previewSurvey(creator));

    preview(creator).model.testAgain();
    const second = previewSurvey(creator);
    render(second);

    const bar = second.findLayoutElement("complete-customization").data as {
      isDisposed: boolean;
    };
    expect(bar.isDisposed).toBe(false);
  });

  it("keeps the designer survey", () => {
    const creator = designer();
    disposeReplacedSurveys(creator);
    const designerSurvey = creator.survey;
    creator.activeTab = "preview";
    render(previewSurvey(creator));
    preview(creator).model.testAgain();
    render(previewSurvey(creator));

    expect(designerSurvey.isDisposed).toBe(false);
  });

  it("stops after unbind", () => {
    const creator = designer();
    const unbind = disposeReplacedSurveys(creator);
    creator.activeTab = "preview";
    const first = previewSurvey(creator);
    render(first);
    unbind();

    preview(creator).model.testAgain();
    render(previewSurvey(creator));

    expect(first.isDisposed).toBe(false);
  });
});
