import { Model, Question } from "survey-core";
import { describe, expect, it } from "vitest";
import { bindStorageOnlyFileModeToSurvey } from "../infrastructure/survey-bindings";

type QuestionWithStoreAsText = Question & { storeDataAsText?: boolean };

describe("bindStorageOnlyFileModeToSurvey", () => {
  it("forces storeDataAsText to false on an existing file question", () => {
    // Arrange
    const model = new Model({
      elements: [{ type: "file", name: "attachment", storeDataAsText: true }],
    });

    // Act
    bindStorageOnlyFileModeToSurvey(model);

    // Assert
    const question = model.getQuestionByName(
      "attachment",
    ) as QuestionWithStoreAsText;
    expect(question.storeDataAsText).toBe(false);
  });

  it("forces storeDataAsText to false on an existing signaturepad question", () => {
    // Arrange
    const model = new Model({
      elements: [{ type: "signaturepad", name: "signature" }],
    });

    // Act
    bindStorageOnlyFileModeToSurvey(model);

    // Assert
    const question = model.getQuestionByName(
      "signature",
    ) as QuestionWithStoreAsText;
    expect(question.storeDataAsText).toBe(false);
  });

  it("forces storeDataAsText to false on a file question nested in a dynamic panel template", () => {
    // Arrange
    const model = new Model({
      elements: [
        {
          type: "paneldynamic",
          name: "attachments",
          templateElements: [{ type: "file", name: "attachment" }],
          panelCount: 1,
        },
      ],
    });

    // Act
    bindStorageOnlyFileModeToSurvey(model);

    // Assert
    const nested = model
      .getAllQuestions(false, false, true)
      .find((q) => q.getType() === "file") as
      | QuestionWithStoreAsText
      | undefined;
    expect(nested?.storeDataAsText).toBe(false);
  });

  it("leaves unrelated question types untouched", () => {
    // Arrange
    const model = new Model({ elements: [{ type: "text", name: "comment" }] });

    // Act & Assert
    expect(() => bindStorageOnlyFileModeToSurvey(model)).not.toThrow();
    const question = model.getQuestionByName(
      "comment",
    ) as QuestionWithStoreAsText;
    expect(question.storeDataAsText).toBeUndefined();
  });

  it("forces storeDataAsText to false on a file question added after binding", () => {
    // Arrange
    const model = new Model({ elements: [] });
    bindStorageOnlyFileModeToSurvey(model);

    // Act
    model.pages[0].addNewQuestion("file", "newAttachment");

    // Assert
    const question = model.getQuestionByName(
      "newAttachment",
    ) as QuestionWithStoreAsText;
    expect(question.storeDataAsText).toBe(false);
  });

  it("stops enforcing after the returned cleanup runs", () => {
    // Arrange
    const model = new Model({ elements: [] });
    const cleanup = bindStorageOnlyFileModeToSurvey(model);

    // Act
    cleanup();
    model.pages[0].addNewQuestion("file", "newAttachment");

    // Assert
    const question = model.getQuestionByName(
      "newAttachment",
    ) as QuestionWithStoreAsText;
    expect(question.storeDataAsText).toBe(true);
  });
});
