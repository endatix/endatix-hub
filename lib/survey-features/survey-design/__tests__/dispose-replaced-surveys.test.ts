import { describe, expect, it } from "vitest";
import type { SurveyModel } from "survey-core";
import { SurveyCreatorModel, type TabTestPlugin } from "survey-creator-core";

// survey-creator-core 3.2.3 disposes the simulator survey it replaces (Test again,
// a theme edit, leaving Preview or Theme). It detaches the shared Test again bar
// first, because SurveyModel.dispose would dispose that bar's data too. A bump
// that drops disposeSurvey brings back the scrollWidth crash on file, image
// picker and boolean questions: their observers outlive the nodes React reuses.

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

describe("replaced simulator surveys", () => {
  it("disposes the Preview survey Test again replaced, before the new one renders", () => {
    // Arrange
    const creator = designer();
    creator.activeTab = "preview";
    const first = previewSurvey(creator);

    // Act
    preview(creator).model.testAgain();
    const second = previewSurvey(creator);

    // Assert
    expect(second).not.toBe(first);
    expect(first.isDisposed).toBe(true);
    expect(second.isDisposed).toBe(false);
  });

  it("disposes the questions of the replaced survey, so their resize observers stop", () => {
    // Arrange
    const creator = designer();
    creator.activeTab = "preview";
    const questions = previewSurvey(creator).getAllQuestions();

    // Act
    preview(creator).model.testAgain();

    // Assert
    expect(questions.map((q) => q.isDisposed)).toEqual([true, true, true]);
  });

  it("disposes every survey a later Test again replaced", () => {
    // Arrange
    const creator = designer();
    creator.activeTab = "preview";
    const first = previewSurvey(creator);

    // Act
    preview(creator).model.testAgain();
    const skipped = previewSurvey(creator);
    preview(creator).model.testAgain();

    // Assert
    expect([first.isDisposed, skipped.isDisposed]).toEqual([true, true]);
  });

  it("keeps the Test again bar the Creator shares between Preview surveys", () => {
    // Arrange
    const creator = designer();
    creator.activeTab = "preview";

    // Act
    preview(creator).model.testAgain();
    const second = previewSurvey(creator);
    const bar = second.findLayoutElement("complete-customization").data as {
      isDisposed: boolean;
    };

    // Assert
    expect(bar.isDisposed).toBe(false);
  });

  it("disposes the Themes survey when Preview replaces it", () => {
    // Arrange
    const creator = designer();
    creator.activeTab = "theme";
    const themeSurvey = (
      creator.getPlugin("theme") as unknown as {
        model: { survey: SurveyModel };
      }
    ).model.survey;

    // Act
    creator.activeTab = "preview";

    // Assert
    expect(themeSurvey.isDisposed).toBe(true);
    expect(previewSurvey(creator).isDisposed).toBe(false);
  });

  it("keeps the designer survey", () => {
    // Arrange
    const creator = designer();
    const designerSurvey = creator.survey;

    // Act
    creator.activeTab = "preview";
    preview(creator).model.testAgain();

    // Assert
    expect(designerSurvey.isDisposed).toBe(false);
  });
});
