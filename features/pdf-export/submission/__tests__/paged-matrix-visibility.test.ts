import { Model, QuestionMatrixDynamicModel } from "survey-core";
import { expect, it, vi } from "vitest";
import { buildMatrixDropdownTableData } from "../answers/pdf-matrixdropdown-answer";

function pagedMatrix(page: number) {
  const columns = [
    { name: "late", visibleIf: "{row.flag} = 'yes'" },
    { name: "flag" },
    { name: "early", visibleIf: "{row.flag} = 'first'" },
    { name: "secret", visible: false },
  ].map(field => ({ ...field, cellType: "text" }));
  const model = new Model({ elements: [{
    type: "matrixdynamic", name: "record", transposeData: true, pageSize: 2, columns,
  }] });
  model.data = { record: [
    { flag: "first", early: "Page one", late: "Hidden on page one" },
    { flag: "no" },
    { flag: "yes", late: "Print me", secret: "Never print" },
    { flag: "no", late: "Hidden on page two" },
  ] };
  const question = model.getQuestionByName("record");
  if (!(question instanceof QuestionMatrixDynamicModel)) throw new Error("Expected dynamic matrix");
  question.pageIndex = page;
  return { model, question };
}

it.each([0, 1])("prints the same visible answers in authored field order starting on page %i", page => {
  // Arrange
  const { model, question } = pagedMatrix(page);
  const stored = structuredClone(model.data);

  // Act
  const table = buildMatrixDropdownTableData(question)!;

  // Assert
  expect(table.columns.map(entry => entry.title)).toEqual(["Row 1", "Row 2", "Row 3", "Row 4"]);
  expect(table.rows.map(row => [row.label, ...table.columns.map(c => row.cells[c.key])])).toEqual([
    ["late", "", "", "Print me", ""],
    ["flag", "first", "no", "yes", "no"],
    ["early", "Page one", "", "", ""],
  ]);
  expect(question.pageIndex).toBe(page);
  expect(model.data).toEqual(stored);
});

it("restores the page and leaves answers intact when an entry heading read fails", () => {
  // Arrange
  const { model, question } = pagedMatrix(1);
  const stored = structuredClone(model.data);
  const read = question.getLocalizationString.bind(question);
  vi.spyOn(question, "getLocalizationString").mockImplementation((...args) => {
    if (question.pageIndex === 0 && args[0] === "rowIndexTemplateTitle") throw new Error("Display read failed");
    return read(...args);
  });

  // Act & Assert
  expect(() => buildMatrixDropdownTableData(question)).toThrow("Display read failed");
  expect(question.pageIndex).toBe(1);
  expect(model.data).toEqual(stored);
});
