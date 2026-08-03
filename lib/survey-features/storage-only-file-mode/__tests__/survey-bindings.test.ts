import { Model, Question } from "survey-core";
import { describe, expect, it } from "vitest";
import { bindStorageOnlyFileModeToSurvey } from "../infrastructure/survey-bindings";

type StorageOnlyFileModeQuestion = Question & {
  storeDataAsText?: boolean;
  waitForUpload?: boolean;
};

describe("bindStorageOnlyFileModeToSurvey", () => {
  it("forces storeDataAsText to false and waitForUpload to true on an existing file question", () => {
    // Arrange
    const model = new Model({
      elements: [
        {
          type: "file",
          name: "attachment",
          storeDataAsText: true,
          waitForUpload: false,
        },
      ],
    });

    // Act
    bindStorageOnlyFileModeToSurvey(model);

    // Assert
    const question = model.getQuestionByName(
      "attachment",
    ) as StorageOnlyFileModeQuestion;
    expect(question.storeDataAsText).toBe(false);
    expect(question.waitForUpload).toBe(true);
  });

  it("serializes both forced values explicitly, so they survive a save/reload round trip", () => {
    // Arrange: a question that never had either property set — this is the
    // regression case. storeDataAsText's built-in default is true;
    // waitForUpload's is false. If either Serializer default were ever
    // changed to match the forced value, the explicit value here would look
    // like "default" and get dropped from toJSON(), silently reverting to
    // base64 embedding / not waiting for uploads for a respondent Model that
    // parses this JSON later (see registry.ts).
    const model = new Model({
      elements: [{ type: "file", name: "attachment" }],
    });

    // Act
    bindStorageOnlyFileModeToSurvey(model);

    // Assert
    const question = model.getQuestionByName("attachment") as Question;
    const json = question.toJSON() as {
      storeDataAsText?: boolean;
      waitForUpload?: boolean;
    };
    expect(json.storeDataAsText).toBe(false);
    expect(json.waitForUpload).toBe(true);
  });

  it("forces storeDataAsText to false and waitForUpload to true on an existing signaturepad question", () => {
    // Arrange
    const model = new Model({
      elements: [{ type: "signaturepad", name: "signature" }],
    });

    // Act
    bindStorageOnlyFileModeToSurvey(model);

    // Assert
    const question = model.getQuestionByName(
      "signature",
    ) as StorageOnlyFileModeQuestion;
    expect(question.storeDataAsText).toBe(false);
    expect(question.waitForUpload).toBe(true);
  });

  it("forces both properties on a file question nested in a dynamic panel template", () => {
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
      | StorageOnlyFileModeQuestion
      | undefined;
    expect(nested?.storeDataAsText).toBe(false);
    expect(nested?.waitForUpload).toBe(true);
  });

  it("leaves unrelated question types untouched", () => {
    // Arrange
    const model = new Model({ elements: [{ type: "text", name: "comment" }] });

    // Act & Assert
    expect(() => bindStorageOnlyFileModeToSurvey(model)).not.toThrow();
    const question = model.getQuestionByName(
      "comment",
    ) as StorageOnlyFileModeQuestion;
    expect(question.storeDataAsText).toBeUndefined();
    expect(question.waitForUpload).toBeUndefined();
  });

  it("forces both properties on a file question added after binding", () => {
    // Arrange
    const model = new Model({ elements: [] });
    bindStorageOnlyFileModeToSurvey(model);

    // Act
    model.pages[0].addNewQuestion("file", "newAttachment");

    // Assert
    const question = model.getQuestionByName(
      "newAttachment",
    ) as StorageOnlyFileModeQuestion;
    expect(question.storeDataAsText).toBe(false);
    expect(question.waitForUpload).toBe(true);
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
    ) as StorageOnlyFileModeQuestion;
    expect(question.storeDataAsText).toBe(true);
    expect(question.waitForUpload).toBe(false);
  });
});
