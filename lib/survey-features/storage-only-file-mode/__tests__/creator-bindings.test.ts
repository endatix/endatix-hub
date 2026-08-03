import { Model, Question } from "survey-core";
import type { SurveyCreatorModel } from "survey-creator-core";
import { describe, expect, it, vi } from "vitest";
import { bindStorageOnlyFileModeToCreator } from "../infrastructure/creator-bindings";

type QuestionWithStoreAsText = Question & { storeDataAsText?: boolean };

function createMockCreator(survey: Model): SurveyCreatorModel {
  return {
    survey,
    onSurveyInstanceCreated: { add: vi.fn(), remove: vi.fn() },
  } as unknown as SurveyCreatorModel;
}

describe("bindStorageOnlyFileModeToCreator", () => {
  it("enforces storeDataAsText on the designer survey's file questions", () => {
    // Arrange
    const survey = new Model({
      elements: [{ type: "file", name: "attachment", storeDataAsText: true }],
    });
    const creator = createMockCreator(survey);

    // Act
    bindStorageOnlyFileModeToCreator(creator);

    // Assert
    const question = survey.getQuestionByName(
      "attachment",
    ) as QuestionWithStoreAsText;
    expect(question.storeDataAsText).toBe(false);
  });

  it("returns a cleanup function that unbinds the designer survey", () => {
    // Arrange
    const survey = new Model({ elements: [] });
    const creator = createMockCreator(survey);
    const cleanup = bindStorageOnlyFileModeToCreator(creator);

    // Act
    cleanup();
    survey.pages[0].addNewQuestion("file", "newAttachment");

    // Assert
    const question = survey.getQuestionByName(
      "newAttachment",
    ) as QuestionWithStoreAsText;
    expect(question.storeDataAsText).toBe(true);
  });
});
