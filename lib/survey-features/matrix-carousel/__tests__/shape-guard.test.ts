import { ItemValue, Model, QuestionMatrixModel } from "survey-core";
import { SurveyQuestionMatrix } from "survey-react-ui";
import { describe, expect, it } from "vitest";

/**
 * matrix-carousel avoids subclassing QuestionMatrixModel by calling two
 * public methods directly (getMatrixSingleInputQuestions, resetSingleInput)
 * instead of activating SurveyJS's own protected isSingleInputMode pathway,
 * and by overriding SurveyQuestionMatrix.renderElement. All three are
 * undocumented enough that a SurveyJS upgrade could silently change their
 * shape — this guard exists to fail loudly instead.
 */
function buildMatrixModel(): { model: Model; question: QuestionMatrixModel } {
  const model = new Model({
    pages: [
      {
        elements: [
          {
            type: "matrix",
            name: "q1",
            columns: [
              { value: "1", text: "Disagree" },
              { value: "2", text: "Agree" },
            ],
            rows: [
              { value: "r1", text: "Row 1" },
              { value: "r2", text: "Row 2" },
            ],
          },
        ],
      },
    ],
  });

  return {
    model,
    question: model.getQuestionByName("q1") as QuestionMatrixModel,
  };
}

describe("matrix-carousel shape guard", () => {
  it("getMatrixSingleInputQuestions is public and decomposes rows without isSingleInputMode ever being set", () => {
    // Arrange
    const { question } = buildMatrixModel();

    // Act
    const decomposed = question.getMatrixSingleInputQuestions(question, false);

    // Assert
    expect(decomposed).toHaveLength(2);
    expect(decomposed[0].getType()).toBe("radiogroup");
    expect(decomposed[0].choices).toHaveLength(2);
  });

  it("decomposed questions share the matrix's columns as their choices", () => {
    // Arrange
    const { question } = buildMatrixModel();

    // Act
    const [firstRow] = question.getMatrixSingleInputQuestions(question, false);

    // Assert
    expect(firstRow.choices.map((c: ItemValue) => c.value)).toEqual(["1", "2"]);
  });

  it("branches to checkbox questions when the matrix is multi-select", () => {
    // Arrange
    const { question } = buildMatrixModel();
    question.cellType = "checkbox";

    // Act
    const [firstRow] = question.getMatrixSingleInputQuestions(question, false);

    // Assert
    expect(firstRow.getType()).toBe("checkbox");
  });

  it("resetSingleInput is public and callable after decomposition", () => {
    // Arrange
    const { question } = buildMatrixModel();
    question.getMatrixSingleInputQuestions(question, false);

    // Act & Assert
    expect(() => question.resetSingleInput()).not.toThrow();
  });

  it("SurveyQuestionMatrix.renderElement remains present and overridable", () => {
    // Assert — protected in TS, so read through the prototype directly.
    const proto = SurveyQuestionMatrix.prototype as unknown as Record<string, unknown>;
    expect(typeof proto.renderElement).toBe("function");
  });
});
