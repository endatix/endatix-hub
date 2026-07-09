import { QuestionFactory, Serializer } from "survey-core";
import { beforeAll, describe, expect, it } from "vitest";
import {
  DRAG_CATEGORIZE_ITEM_CLASS,
  DRAG_CATEGORIZE_TYPE,
  DRAG_CATEGORIZE_ZONE_CLASS,
} from "../constants";
import { DragCategorizeQuestion } from "../infrastructure/drag-categorize-question.model";
import { registerDragCategorizeGlobals } from "../infrastructure/registry";

describe("registerDragCategorizeGlobals", () => {
  beforeAll(() => {
    registerDragCategorizeGlobals();
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

    // Assert
    expect(imageUrl?.type).toBe("image");
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
    expect(() => registerDragCategorizeGlobals()).not.toThrow();
  });
});
