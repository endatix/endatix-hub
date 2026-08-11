import { Model, QuestionMatrixModel } from "survey-core";
import { beforeAll, describe, expect, it } from "vitest";
import { registerMatrixCarouselSchema } from "../../infrastructure/registry";
import { syncMatrixCarouselRowsFromSource } from "../sync-rows-from-source";

function buildModel(overrides: Record<string, unknown> = {}) {
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
              { value: "c", text: "Water" },
            ],
          },
          {
            type: "matrix",
            name: "q1",
            edxDisplayMode: "carousel",
            edxCarryForwardEnabled: true,
            edxCarryForwardSources: ["source"],
            edxCarryForwardMode: "all",
            columns: ["1", "2"],
            rows: [],
            ...overrides,
          },
        ],
      },
    ],
  });
}

describe("syncMatrixCarouselRowsFromSource", () => {
  beforeAll(() => {
    registerMatrixCarouselSchema();
  });

  it("builds rows from the source question's choices", () => {
    // Arrange
    const model = buildModel();
    const target = model.getQuestionByName("q1") as QuestionMatrixModel;

    // Act
    syncMatrixCarouselRowsFromSource(model, target);

    // Assert
    expect(target.rows.map((r) => r.value)).toEqual(["a", "b", "c"]);
    expect(target.rows.map((r) => r.text)).toEqual(["Coffee", "Tea", "Water"]);
  });

  it("does nothing when row-sourcing is disabled", () => {
    // Arrange
    const model = buildModel({ edxCarryForwardEnabled: false });
    const target = model.getQuestionByName("q1") as QuestionMatrixModel;

    // Act
    syncMatrixCarouselRowsFromSource(model, target);

    // Assert
    expect(target.rows).toHaveLength(0);
  });

  it("does nothing when the display mode is grid, even with row-sourcing enabled", () => {
    // Arrange
    const model = buildModel({ edxDisplayMode: "grid" });
    const target = model.getQuestionByName("q1") as QuestionMatrixModel;

    // Act
    syncMatrixCarouselRowsFromSource(model, target);

    // Assert
    expect(target.rows).toHaveLength(0);
  });

  it("does nothing when the source question does not exist", () => {
    // Arrange
    const model = buildModel({ edxCarryForwardSources: ["missing"] });
    const target = model.getQuestionByName("q1") as QuestionMatrixModel;

    // Act
    syncMatrixCarouselRowsFromSource(model, target);

    // Assert
    expect(target.rows).toHaveLength(0);
  });

  it("aggregates and deduplicates rows from multiple sources", () => {
    // Arrange — same aggregation pipeline carry-forward's choices sync uses
    const model = new Model({
      pages: [
        {
          elements: [
            { type: "checkbox", name: "brands", choices: ["A", "B"] },
            { type: "radiogroup", name: "colors", choices: ["B", "Red"] },
            {
              type: "matrix",
              name: "q1",
              edxDisplayMode: "carousel",
              edxCarryForwardEnabled: true,
              edxCarryForwardSources: ["brands", "colors"],
              edxCarryForwardMode: "all",
              columns: ["1", "2"],
              rows: [],
            },
          ],
        },
      ],
    });
    const target = model.getQuestionByName("q1") as QuestionMatrixModel;

    // Act
    syncMatrixCarouselRowsFromSource(model, target);

    // Assert
    expect(target.rows.map((r) => r.value)).toEqual(["A", "B", "Red"]);
  });

  it("respects selected mode", () => {
    // Arrange
    const model = buildModel({ edxCarryForwardMode: "selected" });
    const source = model.getQuestionByName("source");
    source!.value = ["a", "c"];
    const target = model.getQuestionByName("q1") as QuestionMatrixModel;

    // Act
    syncMatrixCarouselRowsFromSource(model, target);

    // Assert
    expect(target.rows.map((r) => r.value)).toEqual(["a", "c"]);
  });

  it("respects unselected mode", () => {
    // Arrange
    const model = buildModel({ edxCarryForwardMode: "unselected" });
    const source = model.getQuestionByName("source");
    source!.value = ["a"];
    const target = model.getQuestionByName("q1") as QuestionMatrixModel;

    // Act
    syncMatrixCarouselRowsFromSource(model, target);

    // Assert
    expect(target.rows.map((r) => r.value)).toEqual(["b", "c"]);
  });

  it("places priority rows first", () => {
    // Arrange
    const model = buildModel({ edxCarryForwardPriorityItems: ["c", "a"] });
    const target = model.getQuestionByName("q1") as QuestionMatrixModel;

    // Act
    syncMatrixCarouselRowsFromSource(model, target);

    // Assert
    expect(target.rows.map((r) => r.value)).toEqual(["c", "a", "b"]);
  });

  it("limits rows when max choices is set", () => {
    // Arrange
    const model = buildModel({
      edxCarryForwardPriorityItems: ["c"],
      edxCarryForwardMaxChoices: 2,
    });
    const target = model.getQuestionByName("q1") as QuestionMatrixModel;

    // Act
    syncMatrixCarouselRowsFromSource(model, target);

    // Assert
    expect(target.rows.map((r) => r.value)).toEqual(["c", "a"]);
  });

  it("translates the source's image property (imagepicker imageLink) onto row imageUrl", () => {
    // Arrange
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "imagepicker",
              name: "source",
              choices: [{ value: "a", text: "A", imageLink: "https://example.com/a.png" }],
            },
            {
              type: "matrix",
              name: "q1",
              edxDisplayMode: "carousel",
              edxCarryForwardEnabled: true,
              edxCarryForwardSources: ["source"],
              columns: ["1", "2"],
              rows: [],
            },
          ],
        },
      ],
    });
    const target = model.getQuestionByName("q1") as QuestionMatrixModel;

    // Act
    syncMatrixCarouselRowsFromSource(model, target);

    // Assert
    expect((target.rows[0] as unknown as { imageUrl?: string }).imageUrl).toBe(
      "https://example.com/a.png",
    );
  });

  it("still finds imageUrl for a plain itemvalue source with no class-specific image property", () => {
    // Arrange — confirms the own-properties-first lookup still falls back
    // correctly to the inherited itemvalue.imageUrl when the source class
    // has no more specific declaration (e.g. another matrix-carousel's rows).
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "checkbox",
              name: "source",
              choices: [{ value: "a", text: "A" }],
            },
            {
              type: "matrix",
              name: "q1",
              edxDisplayMode: "carousel",
              edxCarryForwardEnabled: true,
              edxCarryForwardSources: ["source"],
              columns: ["1", "2"],
              rows: [],
            },
          ],
        },
      ],
    });
    const sourceQuestion = model.getQuestionByName("source");
    sourceQuestion!.choices[0].setPropertyValue("imageUrl", "https://example.com/plain.png");
    const target = model.getQuestionByName("q1") as QuestionMatrixModel;

    // Act
    syncMatrixCarouselRowsFromSource(model, target);

    // Assert
    expect((target.rows[0] as unknown as { imageUrl?: string }).imageUrl).toBe(
      "https://example.com/plain.png",
    );
  });

  it("clears stale row values when rows are rebuilt", () => {
    // Arrange
    const model = buildModel();
    const target = model.getQuestionByName("q1") as QuestionMatrixModel;
    syncMatrixCarouselRowsFromSource(model, target);
    target.value = { a: "1", b: "2", c: "1" };

    // Act — narrow the source so a row (and its stale answer) disappears
    const source = model.getQuestionByName("source");
    source!.value = ["a"];
    (target as unknown as { edxCarryForwardMode: string }).edxCarryForwardMode = "selected";
    syncMatrixCarouselRowsFromSource(model, target);

    // Assert
    expect(target.rows.map((r) => r.value)).toEqual(["a"]);
    expect(target.value).toEqual({ a: "1" });
  });
});
