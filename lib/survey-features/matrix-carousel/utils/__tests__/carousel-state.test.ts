import { Model, QuestionMatrixModel } from "survey-core";
import { describe, expect, it } from "vitest";
import {
  getCurrentRowIndex,
  reclampCurrentRowIndex,
  setCurrentRowIndex,
} from "../carousel-state";

function buildMatrixQuestion(name = "q1"): QuestionMatrixModel {
  const model = new Model({
    pages: [
      {
        elements: [
          { type: "matrix", name, columns: ["1", "2"], rows: ["r1", "r2", "r3"] },
        ],
      },
    ],
  });

  return model.getQuestionByName(name) as QuestionMatrixModel;
}

describe("carousel-state", () => {
  it("defaults to index 0 for a question that has never been touched", () => {
    // Arrange
    const question = buildMatrixQuestion();

    // Assert
    expect(getCurrentRowIndex(question)).toBe(0);
  });

  it("keeps state independent per question instance", () => {
    // Arrange
    const questionA = buildMatrixQuestion("a");
    const questionB = buildMatrixQuestion("b");

    // Act
    setCurrentRowIndex(questionA, 2, 3);

    // Assert
    expect(getCurrentRowIndex(questionA)).toBe(2);
    expect(getCurrentRowIndex(questionB)).toBe(0);
  });

  it("clamps setCurrentRowIndex to [0, rowCount - 1]", () => {
    // Arrange
    const question = buildMatrixQuestion();

    // Act & Assert
    expect(setCurrentRowIndex(question, -1, 3)).toBe(0);
    expect(setCurrentRowIndex(question, 10, 3)).toBe(2);
    expect(setCurrentRowIndex(question, 1, 3)).toBe(1);
  });

  it("treats a zero row count as index 0 rather than a negative range", () => {
    // Arrange
    const question = buildMatrixQuestion();

    // Act & Assert
    expect(setCurrentRowIndex(question, 5, 0)).toBe(0);
  });

  it("reclampCurrentRowIndex pulls an out-of-range index back in after rows shrink", () => {
    // Arrange
    const question = buildMatrixQuestion();
    setCurrentRowIndex(question, 2, 3);

    // Act
    const reclamped = reclampCurrentRowIndex(question, 1);

    // Assert
    expect(reclamped).toBe(0);
    expect(getCurrentRowIndex(question)).toBe(0);
  });

  it("reclampCurrentRowIndex leaves an in-range index untouched", () => {
    // Arrange
    const question = buildMatrixQuestion();
    setCurrentRowIndex(question, 1, 3);

    // Act
    const reclamped = reclampCurrentRowIndex(question, 3);

    // Assert
    expect(reclamped).toBe(1);
  });
});
