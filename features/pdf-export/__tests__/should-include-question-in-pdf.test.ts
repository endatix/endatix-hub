import { describe, expect, it } from "vitest";
import { Question, QuestionHtmlModel, Model } from "survey-core";
import { shouldIncludeQuestionInPdf } from "../should-include-question-in-pdf";

function questionFromSurvey(json: object): Question {
  const survey = new Model({
    elements: [json],
  });
  return survey.getAllQuestions()[0];
}

describe("shouldIncludeQuestionInPdf", () => {
  it("excludes html questions", () => {
    // Arrange
    const question = questionFromSurvey({
      type: "html",
      name: "intro",
      html: "<p>hi</p>",
    });

    // Act & Assert
    expect(question).toBeInstanceOf(QuestionHtmlModel);
    expect(shouldIncludeQuestionInPdf(question)).toBe(false);
  });

  it("excludes empty visible questions", () => {
    // Arrange
    const question = questionFromSurvey({
      type: "text",
      name: "empty",
    });

    // Act & Assert
    expect(shouldIncludeQuestionInPdf(question)).toBe(false);
  });

  it("includes answered visible questions", () => {
    // Arrange
    const question = questionFromSurvey({
      type: "text",
      name: "filled",
    });
    question.value = "yes";

    // Act & Assert
    expect(shouldIncludeQuestionInPdf(question)).toBe(true);
  });
});
