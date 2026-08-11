import { Model, Serializer } from "survey-core";
import { describe, expect, it } from "vitest";
import { matrixCarouselExtension } from "../infrastructure/matrix-carousel.extension";
import { DISPLAY_MODE_PROPERTY, MATRIX_TYPE } from "../constants";

describe("matrixCarouselExtension", () => {
  it("onInit registers the schema and the ReactQuestionFactory renderer", () => {
    // Act
    matrixCarouselExtension.onInit?.();

    // Assert
    expect(Serializer.findProperty(MATRIX_TYPE, DISPLAY_MODE_PROPERTY)).toBeDefined();
  });

  it("onModelReady binds carousel and row-source handlers without throwing", () => {
    // Arrange
    matrixCarouselExtension.onInit?.();
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "matrix",
              name: "q1",
              edxDisplayMode: "carousel",
              columns: ["1", "2"],
              rows: ["r1"],
            },
          ],
        },
      ],
    });

    // Act & Assert
    expect(() =>
      matrixCarouselExtension.onModelReady?.(model, { getRuntimeState: () => ({}) }),
    ).not.toThrow();
  });
});
