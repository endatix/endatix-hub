import { QuestionFactory, Serializer } from "survey-core";
import { SurveyCreatorModel } from "survey-creator-core";
import { describe, expect, it } from "vitest";
import { DRAG_CATEGORIZE_TYPE } from "../constants";
import { dragCategorizeExtension } from "../drag-categorize.extension";

/**
 * The adapter the extension loader drives. Registration reaching the right
 * surface is what decides whether a form using this type renders at all —
 * SurveyJS drops elements whose type is unknown at parse time.
 */
describe("dragCategorizeExtension", () => {
  it("registers the question type on init", () => {
    // Act
    dragCategorizeExtension.onInit?.();

    // Assert
    expect(Serializer.findClass(DRAG_CATEGORIZE_TYPE)).toBeTruthy();
    expect(
      QuestionFactory.Instance.getAllTypes(),
    ).toContain(DRAG_CATEGORIZE_TYPE);
  });

  it("is safe to initialize more than once", () => {
    // Act — several surfaces may load the extension in one session
    dragCategorizeExtension.onInit?.();

    // Assert
    expect(() => dragCategorizeExtension.onInit?.()).not.toThrow();
  });

  it("puts the toolbox item in the choice category when a creator is ready", () => {
    // Arrange
    dragCategorizeExtension.onInit?.();
    const creator = new SurveyCreatorModel({});

    // Act
    dragCategorizeExtension.onCreatorReady?.(creator, {
      getRuntimeState: () => ({}),
    });

    // Assert
    const toolboxItem = creator.toolbox.getItemByName(DRAG_CATEGORIZE_TYPE);
    expect(toolboxItem).toBeTruthy();
    expect(toolboxItem?.category).toBe("choice");
    expect(toolboxItem?.json?.zones).toEqual([
      { value: "zone1" },
      { value: "zone2" },
    ]);
  });
});
