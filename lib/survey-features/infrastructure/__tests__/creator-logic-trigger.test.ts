import { describe, expect, it } from "vitest";
import {
  editorLocalization,
  getLocaleStrings,
  SurveyLogic,
} from "survey-creator-core";
import { registerCreatorLogicTrigger } from "../creator-logic-trigger";

const trigger = {
  type: "samplegate",
  className: "samplegatetrigger",
  label: "Sample gate",
  description: "Ends the survey when the expression is true.",
  actionText: "respondent is gated",
};

describe("registerCreatorLogicTrigger", () => {
  it("adds one Logic tab action and the locale strings Creator reads", () => {
    // Act
    registerCreatorLogicTrigger(trigger);
    registerCreatorLogicTrigger(trigger);

    // Assert
    const matches = SurveyLogic.types.filter(
      (type) => type.name === "trigger_samplegate",
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      name: "trigger_samplegate",
      baseClass: "samplegatetrigger",
      propertyName: "expression",
    });

    const strings = getLocaleStrings("en");
    expect(strings.triggers.samplegatetrigger).toBe("Sample gate");
    expect(strings.ed.lg.trigger_samplegateName).toBe("Sample gate");
    expect(strings.ed.lg.trigger_samplegateDescription).toBe(
      trigger.description,
    );
    expect(strings.ed.lg.trigger_samplegateText).toBe(trigger.actionText);
    expect(editorLocalization.getTriggerName("samplegatetrigger")).toBe(
      "Sample gate",
    );
  });
});
