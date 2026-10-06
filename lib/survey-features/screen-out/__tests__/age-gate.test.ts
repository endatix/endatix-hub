import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Model } from "survey-core";
import { describe, expect, it } from "vitest";
import { registerScreenOutTrigger } from "../infrastructure/registry";
import { SCREEN_OUT_TRIGGER_TYPE } from "../constants";

const schema = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "fixtures/age-gate.json"),
    "utf8",
  ),
);

registerScreenOutTrigger();

describe("age gate", () => {
  it("screens out under 18 onto the custom thank-you page", () => {
    // Arrange
    const survey = new Model(schema);

    // Act
    survey.setValue("age", "under_18");
    survey.nextPage();

    // Assert
    expect(survey.state).toBe("completed");
    expect(survey.processedCompletedHtml).toContain("18 or older");
  });

  it("asks 18 or older for a favorite alcohol and keeps the survey open", () => {
    // Arrange
    const survey = new Model(schema);

    // Act
    survey.setValue("age", "18_or_over");
    survey.nextPage();

    // Assert
    expect(survey.isCompleted).toBe(false);
    expect(survey.currentPage.name).toBe("alcohol");
    expect(survey.getQuestionByName("favoriteAlcohol").isVisible).toBe(true);
  });

  it("uses a screen-out trigger, not a skip or a calculated result", () => {
    // Act & Assert
    expect(schema.triggers).toEqual([
      { type: SCREEN_OUT_TRIGGER_TYPE, expression: "{age} = 'under_18'" },
    ]);
    expect(schema.calculatedValues).toBeUndefined();
    expect(schema.showCompletePage).not.toBe(false);
    expect(schema.completedHtmlOnCondition[0].expression).toBe(
      "{age} = 'under_18'",
    );
  });
});
