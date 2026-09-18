import { Model, QuestionMatrixDropdownModel } from "survey-core";
import { describe, expect, it } from "vitest";
import { buildMatrixDropdownTableData } from "../answers/pdf-matrixdropdown-answer";

function getMatrixQuestion(
  model: Model,
  name: string,
): QuestionMatrixDropdownModel {
  return model.getQuestionByName(name) as QuestionMatrixDropdownModel;
}

describe("buildMatrixDropdownTableData", () => {
  it("returns populated rows for a matrixdynamic answer (regression: previously always 'No Answer')", () => {
    // Arrange — a populated matrixdynamic question, same shape as the "List
    // of participants" question that rendered as "No Answer" in production.
    const model = new Model({
      elements: [
        {
          type: "matrixdynamic",
          name: "qMatrixDynamic",
          columns: [
            { name: "company", title: "Company Name", cellType: "text" },
            { name: "years", title: "Years Worked", cellType: "text" },
          ],
          rowCount: 0,
        },
      ],
    });
    model.data = {
      qMatrixDynamic: [
        { company: "Acme", years: "3" },
        { company: "Globex", years: "1" },
      ],
    };

    // Act
    const result = buildMatrixDropdownTableData(
      getMatrixQuestion(model, "qMatrixDynamic"),
    );

    // Assert
    expect(result).not.toBeNull();
    expect(result?.rows).toHaveLength(2);
    expect(result?.columns.map((c) => c.key)).toEqual(["company", "years"]);
    expect(result?.rows[0].cells.company).toBe("Acme");
    expect(result?.rows[0].cells.years).toBe("3");
    expect(result?.rows[1].cells.company).toBe("Globex");
  });

  it("returns populated rows for a matrixdropdown answer (static rows)", () => {
    // Arrange
    const model = new Model({
      elements: [
        {
          type: "matrixdropdown",
          name: "qMatrixDropdown",
          columns: [
            { name: "punctuality", title: "Punctuality" },
            { name: "teamwork", title: "Teamwork" },
          ],
          choices: [1, 2, 3, 4, 5],
          rows: [
            { value: "alice", text: "Alice" },
            { value: "bob", text: "Bob" },
          ],
        },
      ],
    });
    model.data = {
      qMatrixDropdown: {
        alice: { punctuality: 4, teamwork: 5 },
      },
    };

    // Act
    const result = buildMatrixDropdownTableData(
      getMatrixQuestion(model, "qMatrixDropdown"),
    );

    // Assert — only Alice has answers; Bob's empty row is excluded.
    expect(result).not.toBeNull();
    expect(result?.rows).toHaveLength(1);
    expect(result?.rows[0].label).toBe("Alice");
    expect(result?.rows[0].cells.punctuality).toBe("4");
  });

  it("returns null when no row has an answer", () => {
    // Arrange
    const model = new Model({
      elements: [
        {
          type: "matrixdynamic",
          name: "qMatrixDynamic",
          columns: [{ name: "company", title: "Company Name" }],
          rowCount: 0,
        },
      ],
    });

    // Act
    const result = buildMatrixDropdownTableData(
      getMatrixQuestion(model, "qMatrixDynamic"),
    );

    // Assert
    expect(result).toBeNull();
  });

  it("strips HTML from column titles and cell display text", () => {
    // Arrange
    const model = new Model({
      elements: [
        {
          type: "matrixdropdown",
          name: "qMatrixDropdown",
          columns: [
            { name: "score", title: "<b>Score</b>" },
          ],
          choices: [1, 2],
          rows: [{ value: "alice", text: "<i>Alice</i>" }],
        },
      ],
    });
    model.data = {
      qMatrixDropdown: { alice: { score: 2 } },
    };

    // Act
    const result = buildMatrixDropdownTableData(
      getMatrixQuestion(model, "qMatrixDropdown"),
    );

    // Assert
    expect(result?.columns[0].title).toBe("Score");
    expect(result?.rows[0].label).toBe("Alice");
  });
});
