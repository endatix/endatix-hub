import { Model, Serializer } from "survey-core";
import { beforeAll, describe, expect, it } from "vitest";
import {
  CARRY_FORWARD_ENABLED_PROPERTY,
  CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  CARRY_FORWARD_MODE_PROPERTY,
  CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  CARRY_FORWARD_SOURCES_PROPERTY,
} from "@/lib/survey-features/carry-forward/constants";
import { isSupportedCarryForwardQuestionType } from "@/lib/survey-features/carry-forward/supported-question-types";
import {
  DISPLAY_MODE_PROPERTY,
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
    expect(ownProperty?.choices).toEqual([
      { value: "grid", text: "Grid" },
      { value: "carousel", text: "Carousel" },
    ]);
    expect(ownProperty?.defaultValue).toBe("grid");
    expect(builtInProperty?.choices).toEqual(["auto", "table", "list"]);
  });

  it("registers the carousel-mode properties in the general category, not a bespoke carousel section", () => {
    // Act
    const properties = [
      DISPLAY_MODE_PROPERTY,
      SHOW_PROGRESS_INDICATOR_PROPERTY,
      PROGRESS_INDICATOR_TYPE_PROPERTY,
    ].map((name) => Serializer.findProperty(MATRIX_TYPE, name));

    // Assert
    properties.forEach((property) => {
      expect(property?.category).toBe("general");
    });
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

  it("further gates edxProgressIndicatorType behind edxShowProgressIndicator", () => {
    // Act
    const property = Serializer.findProperty(
      MATRIX_TYPE,
      PROGRESS_INDICATOR_TYPE_PROPERTY,
    );

    // Assert
    expect(
      property?.visibleIf?.({ edxDisplayMode: "carousel", edxShowProgressIndicator: true }),
    ).toBe(true);
    expect(
      property?.visibleIf?.({ edxDisplayMode: "carousel", edxShowProgressIndicator: false }),
    ).toBe(false);
  });

  it("registers row-sourcing using carry-forward's actual property names, in the rows category", () => {
    // Act
    const properties = [
      CARRY_FORWARD_ENABLED_PROPERTY,
      CARRY_FORWARD_SOURCES_PROPERTY,
      CARRY_FORWARD_MODE_PROPERTY,
      CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
      CARRY_FORWARD_MAX_CHOICES_PROPERTY,
    ].map((name) => Serializer.findProperty(MATRIX_TYPE, name));

    // Assert
    properties.forEach((property) => {
      expect(property).toBeDefined();
      expect(property?.category).toBe("rows");
    });
  });

  it("gates row-sourcing's dependent properties behind edxCarryForwardEnabled", () => {
    // Act
    const property = Serializer.findProperty(MATRIX_TYPE, CARRY_FORWARD_SOURCES_PROPERTY);

    // Assert
    expect(
      property?.visibleIf?.({ edxDisplayMode: "carousel", edxCarryForwardEnabled: true }),
    ).toBe(true);
    expect(
      property?.visibleIf?.({ edxDisplayMode: "carousel", edxCarryForwardEnabled: false }),
    ).toBe(false);
  });

  it("does not add matrix to carry-forward's own opted-in question types — row-sourcing runs through its own sync entry point, not carry-forward's choices-based one", () => {
    // Assert
    expect(isSupportedCarryForwardQuestionType(MATRIX_TYPE)).toBe(false);
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

  it("is idempotent — re-registration does not throw or replace an existing property", () => {
    // Arrange
    const before = Serializer.findProperty(MATRIX_TYPE, SHOW_PROGRESS_INDICATOR_PROPERTY);
    const visibleIfBefore = before?.visibleIf;

    // Act & Assert
    expect(() => registerMatrixCarouselSchema()).not.toThrow();

    // Assert — same property object, same visibleIf, not silently rebuilt
    const after = Serializer.findProperty(MATRIX_TYPE, SHOW_PROGRESS_INDICATOR_PROPERTY);
    expect(after).toBe(before);
    expect(after?.visibleIf).toBe(visibleIfBefore);
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
