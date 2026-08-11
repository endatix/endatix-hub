import { Model } from "survey-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerMatrixCarouselSchema } from "../infrastructure/registry";
import { bindMatrixCarouselToSurvey, clearMatrixCarouselBindingsForTests } from "../infrastructure/survey-bindings";
import { getCurrentRowIndex, setCurrentRowIndex } from "../utils/carousel-state";
import { getDecomposedRowQuestions } from "../use-cases/navigate-carousel";

function buildModel(rows: unknown[] = ["r1", "r2", "r3"]) {
  return new Model({
    pages: [
      {
        elements: [
          {
            type: "matrix",
            name: "q1",
            edxDisplayMode: "carousel",
            columns: ["1", "2"],
            rows,
          },
        ],
      },
    ],
  });
}

describe("bindMatrixCarouselToSurvey", () => {
  beforeAll(() => {
    registerMatrixCarouselSchema();
  });

  afterAll(() => {
    clearMatrixCarouselBindingsForTests();
  });

  it("resets the decomposed-row cache and reclamps the index when rows shrink at runtime", () => {
    // Arrange
    const model = buildModel();
    const question = model.getQuestionByName("q1") as unknown as {
      rows: unknown[];
    };
    bindMatrixCarouselToSurvey(model);
    const matrixQuestion = model.getQuestionByName("q1");
    setCurrentRowIndex(matrixQuestion as never, 2, 3);
    expect(getDecomposedRowQuestions(matrixQuestion as never)).toHaveLength(3);

    // Act
    question.rows = [{ value: "r1", text: "Row 1" }];

    // Assert
    expect(getDecomposedRowQuestions(matrixQuestion as never)).toHaveLength(1);
    expect(getCurrentRowIndex(matrixQuestion as never)).toBe(0);
  });

  it("also tracks a grid-mode matrix question harmlessly (no crash, index still consistent if later switched to carousel)", () => {
    // Arrange
    const model = new Model({
      pages: [
        {
          elements: [
            { type: "matrix", name: "q1", columns: ["1", "2"], rows: ["r1", "r2"] },
          ],
        },
      ],
    });
    const question = model.getQuestionByName("q1") as unknown as {
      rows: unknown[];
      edxDisplayMode: string;
    };
    bindMatrixCarouselToSurvey(model);
    const matrixQuestion = model.getQuestionByName("q1");
    setCurrentRowIndex(matrixQuestion as never, 1, 2);

    // Act — shrink rows while still in grid mode, then switch to carousel mode
    question.rows = [{ value: "r1", text: "Row 1" }];
    question.edxDisplayMode = "carousel";

    // Assert — the index was already reclamped when rows shrank, regardless of display mode
    expect(getCurrentRowIndex(matrixQuestion as never)).toBe(0);
  });

  it("is idempotent for double-binding the same model", () => {
    // Arrange
    const model = buildModel();

    // Act & Assert
    expect(() => {
      bindMatrixCarouselToSurvey(model);
      bindMatrixCarouselToSurvey(model);
    }).not.toThrow();
  });

  it("attaches handlers to a matrix question added after initial bind, even before carousel mode is enabled on it", () => {
    // Arrange — reproduces the real Creator flow: add a plain matrix question,
    // then enable carousel mode afterward via the property grid. edxDisplayMode
    // changing does not itself re-run attachment, so this only works because
    // attachment isn't gated on carousel mode being active yet.
    const model = buildModel([]);
    bindMatrixCarouselToSurvey(model);
    const page = model.pages[0];
    const newQuestion = page.addNewQuestion("matrix", "q2") as unknown as {
      edxDisplayMode: string;
      columns: unknown[];
      rows: unknown[];
    };
    newQuestion.columns = ["1", "2"];
    newQuestion.rows = ["a", "b"];
    setCurrentRowIndex(newQuestion as never, 1, 2);

    // Act — enable carousel mode only now, after the question already exists
    newQuestion.edxDisplayMode = "carousel";
    newQuestion.rows = [{ value: "a", text: "A" }];

    // Assert
    expect(getCurrentRowIndex(newQuestion as never)).toBe(0);
  });

  it("uses carousel-appropriate wording for the eachRowRequired validation error on a carousel-mode matrix", () => {
    // Arrange — no answers, so completion validation fails on both rows
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "matrix",
              name: "q1",
              edxDisplayMode: "carousel",
              eachRowRequired: true,
              columns: ["1", "2"],
              rows: ["r1", "r2"],
            },
          ],
        },
      ],
    });
    bindMatrixCarouselToSurvey(model);

    // Act
    model.validate();
    const question = model.getQuestionByName("q1") as unknown as {
      errors: { getText: () => string }[];
    };

    // Assert
    const errorTexts = question.errors.map((e) => e.getText());
    expect(errorTexts).toContain(
      "Response required: answer every question before continuing.",
    );
    expect(errorTexts.join(" ")).not.toContain("answer questions in all rows");
  });

  it("leaves the native eachRowRequired wording unchanged for a grid-mode matrix", () => {
    // Arrange — same setup, but no edxDisplayMode (grid, the default)
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "matrix",
              name: "q1",
              eachRowRequired: true,
              columns: ["1", "2"],
              rows: ["r1", "r2"],
            },
          ],
        },
      ],
    });
    bindMatrixCarouselToSurvey(model);

    // Act
    model.validate();
    const question = model.getQuestionByName("q1") as unknown as {
      errors: { getText: () => string }[];
    };

    // Assert — untouched, native SurveyJS wording
    const errorTexts = question.errors.map((e) => e.getText());
    expect(errorTexts.join(" ")).toContain("answer questions in all rows");
  });

  it("stops customizing the validation error text once the binding is cleaned up", () => {
    // Arrange
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "matrix",
              name: "q1",
              edxDisplayMode: "carousel",
              eachRowRequired: true,
              columns: ["1", "2"],
              rows: ["r1", "r2"],
            },
          ],
        },
      ],
    });
    const cleanup = bindMatrixCarouselToSurvey(model);
    cleanup();

    // Act
    model.validate();
    const question = model.getQuestionByName("q1") as unknown as {
      errors: { getText: () => string }[];
    };

    // Assert
    const errorTexts = question.errors.map((e) => e.getText());
    expect(errorTexts.join(" ")).toContain("answer questions in all rows");
  });

  it("cleanup removes handlers so later row changes stop being tracked", () => {
    // Arrange
    const model = buildModel();
    const question = model.getQuestionByName("q1") as unknown as { rows: unknown[] };
    const cleanup = bindMatrixCarouselToSurvey(model);
    const matrixQuestion = model.getQuestionByName("q1");
    setCurrentRowIndex(matrixQuestion as never, 2, 3);

    // Act
    cleanup();
    question.rows = [{ value: "r1", text: "Row 1" }];

    // Assert — no reclamp happened after cleanup
    expect(getCurrentRowIndex(matrixQuestion as never)).toBe(2);
  });
});
