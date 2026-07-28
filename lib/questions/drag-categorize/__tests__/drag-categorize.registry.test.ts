import { Model, QuestionFactory, Serializer } from "survey-core";
import { beforeAll, describe, expect, it } from "vitest";
import {
  DRAG_CATEGORIZE_ITEM_CLASS,
  DRAG_CATEGORIZE_TYPE,
  DRAG_CATEGORIZE_ZONE_CLASS,
} from "../constants";
import { DragCategorizeQuestion } from "../drag-categorize.model";
import { registerDragCategorizeModel } from "../drag-categorize.registry";

describe("registerDragCategorizeModel", () => {
  beforeAll(() => {
    registerDragCategorizeModel();
  });

  it("registers the item sub-type with image and clone properties", () => {
    // Act
    const imageUrl = Serializer.findProperty(
      DRAG_CATEGORIZE_ITEM_CLASS,
      "imageUrl",
    );
    const allowMultipleZones = Serializer.findProperty(
      DRAG_CATEGORIZE_ITEM_CLASS,
      "allowMultipleZones",
    );

    // Assert — "file" is the type the Creator's PropertyGridLinkEditor
    // matches (same as SurveyJS's own `imageLink:file`). Any other type
    // silently degrades the property grid cell to a plain text box with no
    // upload button, so this assertion guards the upload UX.
    expect(imageUrl?.type).toBe("file");
    expect(allowMultipleZones?.type).toBe("boolean");
    expect(allowMultipleZones?.defaultValue).toBe(false);
  });

  it("registers the zone sub-type with min/max constraints", () => {
    // Act
    const minItems = Serializer.findProperty(
      DRAG_CATEGORIZE_ZONE_CLASS,
      "minItems",
    );
    const maxItems = Serializer.findProperty(
      DRAG_CATEGORIZE_ZONE_CLASS,
      "maxItems",
    );

    // Assert
    expect(minItems?.type).toBe("number");
    expect(maxItems?.type).toBe("number");
  });

  it("registers the question class with zones and requireAllItems", () => {
    // Act
    const zones = Serializer.findProperty(DRAG_CATEGORIZE_TYPE, "zones");
    const requireAllItems = Serializer.findProperty(
      DRAG_CATEGORIZE_TYPE,
      "requireAllItems",
    );

    // Assert
    expect(zones?.className).toBe(DRAG_CATEGORIZE_ZONE_CLASS);
    expect(requireAllItems?.type).toBe("boolean");
  });

  it("registers zoneMinWidth with the current layout default", () => {
    // Act
    const zoneMinWidth = Serializer.findProperty(
      DRAG_CATEGORIZE_TYPE,
      "zoneMinWidth",
    );

    // Assert
    expect(zoneMinWidth?.type).toBe("number");
    expect(zoneMinWidth?.defaultValue).toBe(180);
  });

  it("registers showItemLabels defaulting to on", () => {
    // Act
    const showItemLabels = Serializer.findProperty(
      DRAG_CATEGORIZE_TYPE,
      "showItemLabels",
    );

    // Assert
    expect(showItemLabels?.type).toBe("boolean");
    expect(showItemLabels?.defaultValue).toBe(true);
  });

  it("hides select-base special choice properties", () => {
    // Act
    const showOtherItem = Serializer.findProperty(
      DRAG_CATEGORIZE_TYPE,
      "showOtherItem",
    );

    // Assert
    expect(showOtherItem?.visible).toBe(false);
  });

  it("creates the question through QuestionFactory", () => {
    // Act
    const question = QuestionFactory.Instance.createQuestion(
      DRAG_CATEGORIZE_TYPE,
      "q1",
    );

    // Assert
    expect(question).toBeInstanceOf(DragCategorizeQuestion);
    expect(question?.getType()).toBe(DRAG_CATEGORIZE_TYPE);
  });

  it("is idempotent", () => {
    // Act & Assert
    expect(() => registerDragCategorizeModel()).not.toThrow();
  });

  it("lets a Model parse the question without React registration", () => {
    // Arrange — mirrors the server-side PDF path, which registers the model
    // only. SurveyJS silently drops elements whose type it does not know, so
    // this guards the surfaces that build models before the extension
    // loader has resolved.
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: DRAG_CATEGORIZE_TYPE,
              name: "q1",
              choices: ["item_1"],
              zones: [{ value: "zone1" }],
            },
          ],
        },
      ],
    });

    // Act
    const question = model.getQuestionByName("q1");

    // Assert
    expect(question).not.toBeNull();
    expect(question?.getType()).toBe(DRAG_CATEGORIZE_TYPE);
  });
});
