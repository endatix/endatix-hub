import { beforeEach, describe, expect, it } from "vitest";
import { Model } from "survey-core";
import { registerAdvancedCarryForwardGlobals } from "../infrastructure/registry";
import {
  bindAdvancedCarryForwardToSurvey,
  clearAdvancedCarryForwardBindingsForTests,
} from "../infrastructure/survey-bindings";
import { resetCarryForwardUpdateGuardForTests } from "../infrastructure/carry-forward-sync";

const items = [
  { value: 1, text: "Item 1" },
  { value: 2, text: "Item 2" },
  { value: 3, text: "Item 3" },
];

const displayValueOf = (question: string) => ({
  name: `display_${question}`,
  expression: `displayValue('${question}', 3)`,
});

function carryForwardTarget(name: string, source: string, mode = "all") {
  return {
    type: "checkbox",
    name,
    edxCarryForwardEnabled: true,
    edxCarryForwardSources: [source],
    edxCarryForwardMode: mode,
  };
}

describe("expressions see carried-forward choices", () => {
  beforeEach(() => {
    registerAdvancedCarryForwardGlobals();
    clearAdvancedCarryForwardBindingsForTests();
    resetCarryForwardUpdateGuardForTests();
  });

  it("resolves displayValue labels on load for plain, copied, and chained sources", () => {
    // Arrange
    const model = new Model({
      calculatedValues: ["fromPlain", "fromCopy", "fromTarget"].map(
        displayValueOf,
      ),
      elements: [
        { type: "checkbox", name: "plain", choices: items },
        { type: "checkbox", name: "copy", choicesFromQuestion: "plain" },
        carryForwardTarget("fromPlain", "plain"),
        carryForwardTarget("fromCopy", "copy"),
        carryForwardTarget("fromTarget", "fromPlain"),
      ],
    });

    // Act
    bindAdvancedCarryForwardToSurvey(model);

    // Assert
    expect(model.getVariable("display_fromPlain")).toBe("Item 3");
    expect(model.getVariable("display_fromCopy")).toBe("Item 3");
    expect(model.getVariable("display_fromTarget")).toBe("Item 3");
  });

  it("re-evaluates expressions when a target's carry-forward sources change", () => {
    // Arrange
    const model = new Model({
      calculatedValues: [displayValueOf("target")],
      elements: [
        { type: "checkbox", name: "plain", choices: items },
        {
          type: "checkbox",
          name: "other",
          choices: [{ value: 3, text: "Other 3" }],
        },
        carryForwardTarget("target", "plain"),
      ],
    });
    bindAdvancedCarryForwardToSurvey(model);
    const target = model.getQuestionByName("target");

    // Act
    target.setPropertyValue("edxCarryForwardSources", ["other"]);

    // Assert
    expect(model.getVariable("display_target")).toBe("Other 3");
  });

  it("keeps expressions current when a source answer changes in selected mode", () => {
    // Arrange
    const model = new Model({
      calculatedValues: [displayValueOf("target")],
      elements: [
        { type: "checkbox", name: "plain", choices: items },
        carryForwardTarget("target", "plain", "selected"),
      ],
    });
    bindAdvancedCarryForwardToSurvey(model);

    // Act
    model.setValue("plain", [3]);

    // Assert
    expect(model.getVariable("display_target")).toBe("Item 3");
  });

  it("resolves displayValue labels for a target inside a dynamic panel", () => {
    // Arrange
    const model = new Model({
      elements: [
        { type: "checkbox", name: "plain", choices: items },
        {
          type: "paneldynamic",
          name: "loop",
          panelCount: 1,
          templateElements: [
            carryForwardTarget("target", "plain"),
            {
              type: "expression",
              name: "label",
              expression: "displayValue('target', 3)",
            },
          ],
        },
      ],
    });

    // Act
    bindAdvancedCarryForwardToSurvey(model);

    // Assert
    const panel = (
      model.getQuestionByName("loop") as unknown as {
        panels: { getQuestionByName: (n: string) => { value: unknown } }[];
      }
    ).panels[0]!;
    expect(panel.getQuestionByName("label").value).toBe("Item 3");
  });
});
