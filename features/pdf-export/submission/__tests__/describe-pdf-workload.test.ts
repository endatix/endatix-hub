import { describe, expect, it } from "vitest";
import { Model } from "survey-core";
import { describePdfWorkload } from "../describe-pdf-workload";

function modelWith(json: object, data: Record<string, unknown> = {}) {
  const model = new Model(json);
  model.data = data;
  return model;
}

describe("describePdfWorkload", () => {
  it("counts only the questions the PDF will draw", () => {
    // Arrange - an unanswered question and an html element are both skipped
    const model = modelWith(
      {
        elements: [
          { type: "text", name: "answered" },
          { type: "text", name: "blank" },
          { type: "html", name: "banner", html: "<p>hi</p>" },
        ],
      },
      { answered: "yes" },
    );

    // Act
    const workload = describePdfWorkload(model);

    // Assert
    expect(workload.questionCount).toBe(1);
    expect(workload.answeredCount).toBe(1);
  });

  it("counts matrix rows, the prime suspect for slow renders", () => {
    // Arrange
    const model = modelWith(
      {
        elements: [
          {
            type: "matrixdropdown",
            name: "grid",
            rows: ["r1", "r2", "r3"],
            columns: [{ name: "c1" }],
          },
        ],
      },
      { grid: { r1: { c1: "a" }, r2: { c1: "b" }, r3: { c1: "c" } } },
    );

    // Act
    const workload = describePdfWorkload(model);

    // Assert
    expect(workload.questionCount).toBe(1);
    expect(workload.matrixRowCount).toBe(3);
  });

  it("counts file-bearing questions, which also cost storage read tokens", () => {
    // Arrange
    const model = modelWith(
      {
        elements: [
          { type: "file", name: "upload" },
          { type: "text", name: "note" },
        ],
      },
      {
        upload: [{ name: "a.pdf", content: "https://example.com/a.pdf" }],
        note: "hello",
      },
    );

    // Act
    const workload = describePdfWorkload(model);

    // Assert
    expect(workload.fileAttachmentCount).toBe(1);
    expect(workload.questionCount).toBe(2);
  });

  it("returns zeroes for an empty submission rather than throwing", () => {
    // Arrange
    const model = modelWith({ elements: [{ type: "text", name: "q1" }] });

    // Act
    const workload = describePdfWorkload(model);

    // Assert
    expect(workload).toEqual({
      questionCount: 0,
      answeredCount: 0,
      fileAttachmentCount: 0,
      matrixRowCount: 0,
    });
  });
});
