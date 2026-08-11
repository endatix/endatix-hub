import { Model, Serializer } from "survey-core";
import { beforeAll, describe, expect, it } from "vitest";
import {
  DISPLAY_MODE_PROPERTY,
  EDX_ROWS_SOURCE_ENABLED_PROPERTY,
  EDX_ROWS_SOURCE_QUESTION_PROPERTY,
  IMAGE_URL_PROPERTY,
  ITEM_VALUE_CLASS,
  MATRIX_TYPE,
  PROGRESS_INDICATOR_TYPE_PROPERTY,
  SHOW_PROGRESS_INDICATOR_PROPERTY,
} from "../constants";
import { registerMatrixCarouselSchema } from "../infrastructure/registry";

describe("registerMatrixCarouselSchema", () => {
  beforeAll(() => {
    registerMatrixCarouselSchema();
  });

  it("registers edxDisplayMode on matrix with grid/carousel choices defaulting to grid, without colliding with SurveyJS's own displayMode", () => {
    // Act
    const ownProperty = Serializer.findProperty(MATRIX_TYPE, DISPLAY_MODE_PROPERTY);
    const builtInProperty = Serializer.findProperty(MATRIX_TYPE, "displayMode");

    // Assert
    expect(ownProperty).toBeDefined();
    expect(ownProperty?.choices).toEqual(["grid", "carousel"]);
    expect(ownProperty?.defaultValue).toBe("grid");
    expect(builtInProperty?.choices).toEqual(["auto", "table", "list"]);
  });

  it("gates carousel-only properties behind edxDisplayMode === carousel", () => {
    // Act
    const property = Serializer.findProperty(
      MATRIX_TYPE,
      SHOW_PROGRESS_INDICATOR_PROPERTY,
    );

    // Assert
    expect(property?.visibleIf?.({ edxDisplayMode: "carousel" })).toBe(true);
    expect(property?.visibleIf?.({ edxDisplayMode: "grid" })).toBe(false);
    expect(property?.visibleIf?.({})).toBe(false);
  });

  it("further gates progressIndicatorType behind showProgressIndicator", () => {
    // Act
    const property = Serializer.findProperty(
      MATRIX_TYPE,
      PROGRESS_INDICATOR_TYPE_PROPERTY,
    );

    // Assert
    expect(
      property?.visibleIf?.({ edxDisplayMode: "carousel", showProgressIndicator: true }),
    ).toBe(true);
    expect(
      property?.visibleIf?.({ edxDisplayMode: "carousel", showProgressIndicator: false }),
    ).toBe(false);
  });

  it("gates the row-source question picker behind edxRowsSourceEnabled", () => {
    // Act
    const property = Serializer.findProperty(
      MATRIX_TYPE,
      EDX_ROWS_SOURCE_QUESTION_PROPERTY,
    );

    // Assert
    expect(
      property?.visibleIf?.({ edxDisplayMode: "carousel", edxRowsSourceEnabled: true }),
    ).toBe(true);
    expect(
      property?.visibleIf?.({ edxDisplayMode: "carousel", edxRowsSourceEnabled: false }),
    ).toBe(false);
  });

  it("does not register the carry-forward opt-in on matrix", () => {
    // Act
    const carryForwardProperty = Serializer.findProperty(
      MATRIX_TYPE,
      "edxCarryForwardEnabled",
    );

    // Assert
    expect(carryForwardProperty).toBeUndefined();
    expect(
      Serializer.findProperty(MATRIX_TYPE, EDX_ROWS_SOURCE_ENABLED_PROPERTY),
    ).toBeDefined();
  });

  it("hides grid-only properties in the carousel property grid without removing them from serialization", () => {
    // Act
    const property = Serializer.findProperty(MATRIX_TYPE, "showHeader");

    // Assert
    expect(property?.visibleIf?.({ edxDisplayMode: "carousel" })).toBe(false);
    expect(property?.visibleIf?.({ edxDisplayMode: "grid" })).toBe(true);
  });

  it("registers imageUrl on the shared itemvalue base as type file with showMode form", () => {
    // Act
    const property = Serializer.findProperty(ITEM_VALUE_CLASS, IMAGE_URL_PROPERTY);

    // Assert
    expect(property).toBeDefined();
    expect(property?.type).toBe("file");
    expect(property?.showMode).toBe("form");
  });

  it("scopes imageUrl visibility to matrix rows, not columns or other question types' choices", () => {
    // Arrange
    const property = Serializer.findProperty(ITEM_VALUE_CLASS, IMAGE_URL_PROPERTY);
    const matrixQuestion = { getType: () => "matrix" };
    const checkboxQuestion = { getType: () => "checkbox" };

    // Assert
    expect(
      property?.visibleIf?.({ locOwner: matrixQuestion, ownerPropertyName: "rows" }),
    ).toBe(true);
    expect(
      property?.visibleIf?.({ locOwner: matrixQuestion, ownerPropertyName: "columns" }),
    ).toBe(false);
    expect(
      property?.visibleIf?.({ locOwner: checkboxQuestion, ownerPropertyName: "choices" }),
    ).toBe(false);
  });

  it("is idempotent", () => {
    // Act & Assert
    expect(() => registerMatrixCarouselSchema()).not.toThrow();
  });

  it("keeps existing grid-mode matrix JSON parsing and serializing unchanged, including showHeader and SurveyJS's own displayMode", () => {
    // Arrange
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "matrix",
              name: "q1",
              showHeader: false,
              displayMode: "list",
              columns: ["1", "2"],
              rows: ["r1", "r2"],
            },
          ],
        },
      ],
    });

    // Act
    const question = model.getQuestionByName("q1");
    const json = model.toJSON();

    // Assert
    expect(question?.rows).toHaveLength(2);
    expect(question?.rows.map((r: { value: string }) => r.value)).toEqual([
      "r1",
      "r2",
    ]);
    expect(question?.showHeader).toBe(false);
    expect(question?.displayMode).toBe("list");
    expect(json.pages[0].elements[0].showHeader).toBe(false);
    expect(json.pages[0].elements[0].displayMode).toBe("list");
  });

  it("lets carousel-mode matrix rows carry an imageUrl", () => {
    // Arrange
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "matrix",
              name: "q1",
              edxDisplayMode: "carousel",
              columns: ["1", "2"],
              rows: [
                { value: "r1", text: "Row 1", imageUrl: "https://example.com/1.png" },
              ],
            },
          ],
        },
      ],
    });

    // Act
    const question = model.getQuestionByName("q1");
    const row = question?.rows[0] as { imageUrl?: string };

    // Assert
    expect(row.imageUrl).toBe("https://example.com/1.png");
  });

  it("round-trips imageUrl and edxDisplayMode through toJSON", () => {
    // Arrange
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "matrix",
              name: "q1",
              edxDisplayMode: "carousel",
              columns: ["1", "2"],
              rows: [
                { value: "r1", text: "Row 1", imageUrl: "https://example.com/1.png" },
              ],
            },
          ],
        },
      ],
    });

    // Act
    const json = model.toJSON();

    // Assert
    expect(json.pages[0].elements[0].edxDisplayMode).toBe("carousel");
    expect(json.pages[0].elements[0].rows[0].imageUrl).toBe(
      "https://example.com/1.png",
    );
  });
});
