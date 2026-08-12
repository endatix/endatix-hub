import { ItemValue, Model, QuestionMatrixModel } from "survey-core";
import { beforeEach, describe, expect, it } from "vitest";
import { clearCarouselStateForTests, getCurrentRowIndex } from "../../utils/carousel-state";
import {
  getActiveRowQuestion,
  goToRow,
  isFirstRow,
  isLastRow,
  nextRow,
  prevRow,
} from "../navigate-carousel";

function buildMatrix(options: { eachRowRequired?: boolean } = {}): QuestionMatrixModel {
  const model = new Model({
    pages: [
      {
        elements: [
          {
            type: "matrix",
            name: "q1",
            eachRowRequired: options.eachRowRequired ?? false,
            columns: [
              { value: "1", text: "Disagree" },
              { value: "2", text: "Agree" },
            ],
            rows: [
              { value: "r1", text: "Row 1" },
              { value: "r2", text: "Row 2" },
              { value: "r3", text: "Row 3" },
            ],
          },
        ],
      },
    ],
  });

  return model.getQuestionByName("q1") as QuestionMatrixModel;
}

describe("navigate-carousel", () => {
  let question: QuestionMatrixModel;

  beforeEach(() => {
    question = buildMatrix();
    clearCarouselStateForTests(question);
  });

  it("starts at row 0", () => {
    // Assert
    expect(getCurrentRowIndex(question)).toBe(0);
    expect(isFirstRow(question)).toBe(true);
    expect(isLastRow(question)).toBe(false);
  });

  it("goToRow clamps to the valid row range", () => {
    // Act & Assert
    expect(goToRow(question, -5)).toBe(0);
    expect(goToRow(question, 99)).toBe(2);
    expect(goToRow(question, 1)).toBe(1);
  });

  it("nextRow advances when the current row has no validation errors", () => {
    // Act
    const advanced = nextRow(question);

    // Assert
    expect(advanced).toBe(true);
    expect(getCurrentRowIndex(question)).toBe(1);
  });

  it("nextRow blocks and does not advance when the current row fails required validation", () => {
    // Arrange
    question = buildMatrix({ eachRowRequired: true });
    clearCarouselStateForTests(question);

    // Act
    const advanced = nextRow(question);

    // Assert
    expect(advanced).toBe(false);
    expect(getCurrentRowIndex(question)).toBe(0);
  });

  it("nextRow advances past a required row once it has an answer", () => {
    // Arrange
    question = buildMatrix({ eachRowRequired: true });
    clearCarouselStateForTests(question);
    const active = getActiveRowQuestion(question);
    active!.value = "1";

    // Act
    const advanced = nextRow(question);

    // Assert
    expect(advanced).toBe(true);
    expect(getCurrentRowIndex(question)).toBe(1);
  });

  it("prevRow never blocks, even from a row that would fail validation", () => {
    // Arrange
    question = buildMatrix({ eachRowRequired: true });
    clearCarouselStateForTests(question);
    goToRow(question, 1);

    // Act
    const newIndex = prevRow(question);

    // Assert
    expect(newIndex).toBe(0);
  });

  it("isLastRow is true only at the final row", () => {
    // Act
    goToRow(question, 2);

    // Assert
    expect(isLastRow(question)).toBe(true);
    expect(isFirstRow(question)).toBe(false);
  });

  it("getActiveRowQuestion returns the decomposed question sharing the matrix columns", () => {
    // Act
    const active = getActiveRowQuestion(question);

    // Assert
    expect(active?.getType()).toBe("radiogroup");
    expect(active?.choices.map((c: ItemValue) => c.value)).toEqual(["1", "2"]);
  });
});
