import { Model } from "survey-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerMatrixCarouselSchema } from "../infrastructure/registry";
import {
  bindMatrixCarouselRowSourceToSurvey,
  clearMatrixCarouselRowSourceBindingsForTests,
} from "../infrastructure/survey-bindings";

function buildModel() {
  return new Model({
    pages: [
      {
        elements: [
          {
            type: "checkbox",
            name: "source",
            choices: [
              { value: "a", text: "Coffee" },
              { value: "b", text: "Tea" },
            ],
          },
          {
            type: "matrix",
            name: "q1",
            edxDisplayMode: "carousel",
            edxRowsSourceEnabled: true,
            edxRowsSourceQuestion: "source",
            edxRowsSourceSelectionMode: "selectedOnly",
            columns: ["1", "2"],
            rows: [],
          },
        ],
      },
    ],
  });
}

describe("bindMatrixCarouselRowSourceToSurvey", () => {
  beforeAll(() => {
    registerMatrixCarouselSchema();
  });

  afterAll(() => {
    clearMatrixCarouselRowSourceBindingsForTests();
  });

  it("syncs rows immediately on bind", () => {
    // Arrange
    const model = buildModel();
    const source = model.getQuestionByName("source");
    source!.value = ["a"];

    // Act
    bindMatrixCarouselRowSourceToSurvey(model);

    // Assert
    const target = model.getQuestionByName("q1");
    expect(target?.rows.map((r: { value: string }) => r.value)).toEqual(["a"]);
  });

  it("re-syncs when the source question's value changes", () => {
    // Arrange
    const model = buildModel();
    bindMatrixCarouselRowSourceToSurvey(model);
    const source = model.getQuestionByName("source");
    const target = model.getQuestionByName("q1");
    expect(target?.rows).toHaveLength(0);

    // Act
    source!.value = ["a", "b"];

    // Assert
    expect(target?.rows.map((r: { value: string }) => r.value)).toEqual(["a", "b"]);
  });

  it("re-syncs when the target's source question is switched to a different question", () => {
    // Arrange
    const model = new Model({
      pages: [
        {
          elements: [
            { type: "checkbox", name: "sourceA", choices: [{ value: "a", text: "A" }] },
            { type: "checkbox", name: "sourceB", choices: [{ value: "b", text: "B" }] },
            {
              type: "matrix",
              name: "q1",
              edxDisplayMode: "carousel",
              edxRowsSourceEnabled: true,
              edxRowsSourceQuestion: "sourceA",
              columns: ["1", "2"],
              rows: [],
            },
          ],
        },
      ],
    });
    bindMatrixCarouselRowSourceToSurvey(model);
    const target = model.getQuestionByName("q1");
    expect(target?.rows.map((r: { value: string }) => r.value)).toEqual(["a"]);

    // Act
    (target as unknown as { edxRowsSourceQuestion: string }).edxRowsSourceQuestion = "sourceB";

    // Assert
    expect(target?.rows.map((r: { value: string }) => r.value)).toEqual(["b"]);
  });

  it("stops syncing once row-sourcing is disabled", () => {
    // Arrange
    const model = buildModel();
    bindMatrixCarouselRowSourceToSurvey(model);
    const source = model.getQuestionByName("source");
    const target = model.getQuestionByName("q1");
    source!.value = ["a"];
    expect(target?.rows).toHaveLength(1);

    // Act
    (target as unknown as { edxRowsSourceEnabled: boolean }).edxRowsSourceEnabled = false;
    source!.value = ["a", "b"];

    // Assert — no further sync after disabling
    expect(target?.rows).toHaveLength(1);
  });

  it("does not throw when no source question is configured", () => {
    // Arrange
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "matrix",
              name: "q1",
              edxDisplayMode: "carousel",
              edxRowsSourceEnabled: true,
              columns: ["1", "2"],
              rows: ["r1"],
            },
          ],
        },
      ],
    });

    // Act & Assert
    expect(() => bindMatrixCarouselRowSourceToSurvey(model)).not.toThrow();
  });

  it("is idempotent for double-binding the same model", () => {
    // Arrange
    const model = buildModel();

    // Act & Assert
    expect(() => {
      bindMatrixCarouselRowSourceToSurvey(model);
      bindMatrixCarouselRowSourceToSurvey(model);
    }).not.toThrow();
  });

  it("cleanup stops future re-syncs", () => {
    // Arrange
    const model = buildModel();
    const cleanup = bindMatrixCarouselRowSourceToSurvey(model);
    const source = model.getQuestionByName("source");
    const target = model.getQuestionByName("q1");
    source!.value = ["a"];
    expect(target?.rows).toHaveLength(1);

    // Act
    cleanup();
    source!.value = ["a", "b"];

    // Assert
    expect(target?.rows).toHaveLength(1);
  });
});
