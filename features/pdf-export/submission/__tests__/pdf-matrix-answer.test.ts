import { Model, QuestionMatrixModel } from "survey-core";
import { describe, expect, it } from "vitest";
import { buildMatrixAnswerTableData } from "../answers/pdf-matrix-answer";

describe("buildMatrixAnswerTableData", () => {
  it("keeps one column per matrix column and marks the selected cell", () => {
    // Arrange
    const model = new Model({
      elements: [
        {
          type: "matrix",
          name: "qMatrix",
          columns: [
            { value: "poor", text: "Poor" },
            { value: "good", text: "Good" },
            { value: "great", text: "Great" },
          ],
          rows: [
            { value: "speed", text: "Speed" },
            { value: "quality", text: "Quality" },
          ],
        },
      ],
    });
    model.data = {
      qMatrix: { speed: "good", quality: "great" },
    };

    // Act
    const result = buildMatrixAnswerTableData(
      model.getQuestionByName("qMatrix") as QuestionMatrixModel,
    );

    // Assert
    expect(result).not.toBeNull();
    expect(result?.columns.map((c) => c.key)).toEqual([
      "poor",
      "good",
      "great",
    ]);
    expect(result?.rows).toHaveLength(2);
    expect(result?.rows[0].cells).toEqual({
      poor: "",
      good: "1",
      great: "",
    });
    expect(result?.rows[1].cells.great).toBe("1");
  });

  it("still builds rows when every cell is unanswered", () => {
    // Arrange
    const model = new Model({
      elements: [
        {
          type: "matrix",
          name: "qMatrix",
          columns: ["a", "b"],
          rows: ["r1"],
        },
      ],
    });

    // Act
    const result = buildMatrixAnswerTableData(
      model.getQuestionByName("qMatrix") as QuestionMatrixModel,
    );

    // Assert
    expect(result).not.toBeNull();
    expect(result?.rows).toHaveLength(1);
    expect(result?.rows[0].cells).toEqual({ a: "", b: "" });
  });
});
