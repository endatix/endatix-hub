import { beforeEach, describe, expect, it, vi } from "vitest";
import { Model, QuestionPanelDynamicModel } from "survey-core";
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

const sourceElements = [
  { type: "checkbox", name: "plain", choices: items },
  { type: "checkbox", name: "copy", choicesFromQuestion: "plain" },
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

function panelLabel(model: Model, index: number): unknown {
  const loop = model.getQuestionByName("loop") as QuestionPanelDynamicModel;
  return loop.panels[index]!.getQuestionByName("label").value;
}

const loopWithTarget = (panelCount: number) => ({
  type: "paneldynamic",
  name: "loop",
  panelCount,
  templateElements: [
    carryForwardTarget("target", "plain"),
    {
      type: "expression",
      name: "label",
      expression: "displayValue('target', 3)",
    },
  ],
});

describe("expressions see carried-forward choices", () => {
  beforeEach(() => {
    registerAdvancedCarryForwardGlobals();
    clearAdvancedCarryForwardBindingsForTests();
    resetCarryForwardUpdateGuardForTests();
  });

  it.each([
    ["a plain question", "plain"],
    ["a choicesFromQuestion copy", "copy"],
    ["another carry-forward target", "first"],
  ])(
    "resolves displayValue labels on load for a target sourced from %s",
    (_, source) => {
      // Arrange
      const model = new Model({
        calculatedValues: [displayValueOf("target")],
        elements: [
          ...sourceElements,
          carryForwardTarget("first", "plain"),
          carryForwardTarget("target", source),
        ],
      });

      // Act
      bindAdvancedCarryForwardToSurvey(model);

      // Assert
      expect(model.getVariable("display_target")).toBe("Item 3");
    },
  );

  it("re-evaluates expressions when a target's carry-forward sources change", () => {
    // Arrange
    const model = new Model({
      calculatedValues: [displayValueOf("target")],
      elements: [
        ...sourceElements,
        {
          type: "checkbox",
          name: "other",
          choices: [{ value: 3, text: "Other 3" }],
        },
        carryForwardTarget("target", "plain"),
      ],
    });
    bindAdvancedCarryForwardToSurvey(model);

    // Act
    model
      .getQuestionByName("target")
      .setPropertyValue("edxCarryForwardSources", ["other"]);

    // Assert
    expect(model.getVariable("display_target")).toBe("Other 3");
  });

  it("re-evaluates expressions when a target's carry-forward mode changes", () => {
    // Arrange
    const model = new Model({
      calculatedValues: [displayValueOf("target")],
      elements: [
        ...sourceElements,
        carryForwardTarget("target", "plain", "selected"),
      ],
    });
    bindAdvancedCarryForwardToSurvey(model);

    // Act
    model
      .getQuestionByName("target")
      .setPropertyValue("edxCarryForwardMode", "all");

    // Assert
    expect(model.getVariable("display_target")).toBe("Item 3");
  });

  it("does not re-run expressions when a settings change leaves the choices as they were", () => {
    // Arrange
    const model = new Model({
      calculatedValues: [displayValueOf("target")],
      elements: [...sourceElements, carryForwardTarget("target", "plain")],
    });
    bindAdvancedCarryForwardToSurvey(model);
    const runExpressions = vi.spyOn(model, "runExpressions");

    // Act
    model
      .getQuestionByName("target")
      .setPropertyValue("edxCarryForwardMaxChoices", 10);

    // Assert
    expect(runExpressions).not.toHaveBeenCalled();
  });

  it("keeps a chained target's expressions current when the first source answer changes", () => {
    // Arrange
    const model = new Model({
      calculatedValues: [displayValueOf("target")],
      elements: [
        ...sourceElements,
        carryForwardTarget("first", "plain", "selected"),
        carryForwardTarget("target", "first"),
      ],
    });
    bindAdvancedCarryForwardToSurvey(model);
    expect(model.getVariable("display_target")).toBe(3);

    // Act
    model.setValue("plain", [3]);

    // Assert
    expect(model.getVariable("display_target")).toBe("Item 3");
  });

  it("resolves displayValue labels for a target in a loop panel present on load", () => {
    // Arrange
    const model = new Model({
      elements: [sourceElements[0], loopWithTarget(1)],
    });

    // Act
    bindAdvancedCarryForwardToSurvey(model);

    // Assert
    expect(panelLabel(model, 0)).toBe("Item 3");
  });

  it("resolves displayValue labels for a target in a loop panel added after load", () => {
    // Arrange
    const model = new Model({
      elements: [sourceElements[0], loopWithTarget(0)],
    });
    bindAdvancedCarryForwardToSurvey(model);
    const loop = model.getQuestionByName("loop") as QuestionPanelDynamicModel;

    // Act
    loop.addPanel();

    // Assert
    expect(panelLabel(model, 0)).toBe("Item 3");
  });
});
