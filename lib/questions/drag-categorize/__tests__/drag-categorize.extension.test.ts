import { readFileSync } from "node:fs";
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

  it("keeps the Creator bindings behind a dynamic import", () => {
    // Arrange — a respondent opening a form with this question type loads this
    // module, so a static import would put survey-creator-core in their chunk
    const source = readFileSync(
      "lib/questions/drag-categorize/drag-categorize.extension.ts",
      "utf8",
    );

    // Assert
    expect(source).not.toMatch(
      /^\s*import\s[^;]*["']\.\/drag-categorize\.creator["']/m,
    );
    expect(source).toMatch(
      /await import\(\s*\n?\s*["']\.\/drag-categorize\.creator["']/,
    );
  });

  it("puts the toolbox item in the choice category when a creator is ready", async () => {
    // Arrange
    dragCategorizeExtension.onInit?.();
    const creator = new SurveyCreatorModel({});

    // Act — onCreatorReady resolves the bindings lazily
    await dragCategorizeExtension.onCreatorReady?.(creator, {
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
