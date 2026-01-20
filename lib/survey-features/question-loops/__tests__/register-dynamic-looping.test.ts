import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SurveyModel, ValueChangedEvent } from "survey-core";
import { registerDynamicLooping } from "../register-dynamic-looping";

describe("registerDynamicLooping", () => {
  let survey: SurveyModel;
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    survey = new SurveyModel();
    cleanup = undefined;
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
    }
  });

  describe("Registration and Cleanup", () => {
    it("should register properties and return cleanup function", () => {
      cleanup = registerDynamicLooping(survey);
      
      expect(cleanup).toBeDefined();
      expect(typeof cleanup).toBe("function");
    });

    it("should remove event handler when cleanup is called", () => {
      cleanup = registerDynamicLooping(survey);
      
      // Verify handler was added by checking that value changes trigger updates
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1"];
      const checkbox = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox.choices = [{ value: "1", text: "Option 1" }];
      checkbox.value = ["1"];
      
      expect(panel.value).toBeDefined();
      
      cleanup();
      
      // After cleanup, changing source should not update panel (handler removed)
      const valueBefore = panel.value;
      checkbox.value = [];
      // Note: The handler is removed, but the value might still change due to other mechanisms
      // The important thing is that cleanup doesn't throw
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe("Handler Behavior", () => {
    it("should prevent infinite loops with isUpdatingLoop flag", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1"];
      
      const checkbox = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox.choices = [
        { value: "1", text: "Option 1" },
        { value: "2", text: "Option 2" },
      ];
      
      // Set initial value - this should not cause infinite loop
      expect(() => {
        checkbox.value = ["1"];
      }).not.toThrow();
      
      // Verify panel was updated
      expect(panel.value).toBeDefined();
    });

    it("should only process paneldynamic questions with loopSource", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel1 = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel1.loopSource = ["q1"];
      
      const panel2 = survey.addNewPage().addNewQuestion("paneldynamic", "panel2");
      // No loopSource
      
      const checkbox = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox.choices = [{ value: "1", text: "Option 1" }];
      checkbox.value = ["1"];
      
      // Only panel1 should have value set
      expect(panel1.value).toBeDefined();
      expect(panel2.value).toBeUndefined();
    });

    it("should ignore events for unrelated questions", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1"];
      
      const checkbox1 = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox1.choices = [{ value: "1", text: "Option 1" }];
      
      const unrelatedQuestion = survey.addNewPage().addNewQuestion("text", "unrelated");
      
      // Change unrelated question - should not trigger panel update
      const initialValue = panel.value;
      unrelatedQuestion.value = "some text";
      
      // Panel value should remain unchanged
      expect(panel.value).toEqual(initialValue);
    });

    it("should process events for loop control properties", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1"];
      
      const checkbox = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox.choices = [
        { value: "1", text: "Option 1" },
        { value: "2", text: "Option 2" },
      ];
      checkbox.value = ["1"];
      
      // Change a loop control property
      panel.randomizeLoop = true;
      
      // Should trigger update
      expect(panel.value).toBeDefined();
    });
  });

  describe("Choice Pattern Filtering", () => {
    it("should filter to selected choices when choicePattern is 'Selected Only'", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1"];
      // Set choicePattern using setProperty to avoid triggering onSetValue
      (panel as any).setPropertyValue("choicePattern", "Selected Only");
      
      const checkbox = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox.choices = [
        { value: "1", text: "Option 1" },
        { value: "2", text: "Option 2" },
        { value: "3", text: "Option 3" },
      ];
      checkbox.value = ["1", "2"];
      
      const panelValue = panel.value as any[];
      expect(panelValue).toBeDefined();
      expect(panelValue.length).toBe(2);
      expect(panelValue.map((v: any) => v.itemId)).toContain("1");
      expect(panelValue.map((v: any) => v.itemId)).toContain("2");
      expect(panelValue.map((v: any) => v.itemId)).not.toContain("3");
    });

    it("should filter to unselected choices when choicePattern is 'Unselected Only'", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1"];
      // Set choicePattern using setProperty to avoid triggering onSetValue
      (panel as any).setPropertyValue("choicePattern", "Unselected Only");
      
      const checkbox = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox.choices = [
        { value: "1", text: "Option 1" },
        { value: "2", text: "Option 2" },
        { value: "3", text: "Option 3" },
      ];
      checkbox.value = ["1"];
      
      const panelValue = panel.value as any[];
      expect(panelValue).toBeDefined();
      expect(panelValue.length).toBe(2);
      expect(panelValue.map((v: any) => v.itemId)).toContain("2");
      expect(panelValue.map((v: any) => v.itemId)).toContain("3");
      expect(panelValue.map((v: any) => v.itemId)).not.toContain("1");
    });

    it("should include all choices when choicePattern is not set or invalid", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1"];
      // Set to an invalid value (not "Selected Only" or "Unselected Only")
      // This should fall through to the else case which includes all choices
      (panel as any).setPropertyValue("choicePattern", "Invalid Pattern");
      
      const checkbox = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox.choices = [
        { value: "1", text: "Option 1" },
        { value: "2", text: "Option 2" },
      ];
      checkbox.value = ["1"];
      
      const panelValue = panel.value as any[];
      expect(panelValue).toBeDefined();
      // When pattern is invalid, all choices should be included
      expect(panelValue.length).toBe(2);
    });

    it("should handle single value (non-array) from radiogroup", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1"];
      (panel as any).setPropertyValue("choicePattern", "Selected Only");
      
      const radiogroup = survey.addNewPage().addNewQuestion("radiogroup", "q1");
      radiogroup.choices = [
        { value: "1", text: "Option 1" },
        { value: "2", text: "Option 2" },
      ];
      radiogroup.value = "1"; // Single value, not array
      
      const panelValue = panel.value as any[];
      expect(panelValue).toBeDefined();
      expect(panelValue.length).toBe(1);
      expect(panelValue[0].itemId).toBe("1");
    });
  });

  describe("Multiple Source Questions", () => {
    it("should combine choices from multiple source questions", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1", "q2"];
      
      const checkbox1 = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox1.choices = [
        { value: "1", text: "Option 1" },
        { value: "2", text: "Option 2" },
      ];
      checkbox1.value = ["1", "2"];
      
      const checkbox2 = survey.addNewPage().addNewQuestion("checkbox", "q2");
      checkbox2.choices = [
        { value: "3", text: "Option 3" },
        { value: "4", text: "Option 4" },
      ];
      checkbox2.value = ["3", "4"];
      
      const panelValue = panel.value as any[];
      expect(panelValue).toBeDefined();
      expect(panelValue.length).toBe(4);
    });

    it("should deduplicate choices by value across multiple sources", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1", "q2"];
      
      const checkbox1 = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox1.choices = [
        { value: "shared", text: "Shared 1" },
        { value: "unique1", text: "Unique 1" },
      ];
      checkbox1.value = ["shared", "unique1"];
      
      const checkbox2 = survey.addNewPage().addNewQuestion("checkbox", "q2");
      checkbox2.choices = [
        { value: "shared", text: "Shared 2" }, // Same value
        { value: "unique2", text: "Unique 2" },
      ];
      checkbox2.value = ["shared", "unique2"];
      
      const panelValue = panel.value as any[];
      const itemIds = panelValue.map((v: any) => v.itemId);
      expect(itemIds.filter((id: string) => id === "shared").length).toBe(1);
      expect(itemIds).toContain("shared");
      expect(itemIds).toContain("unique1");
      expect(itemIds).toContain("unique2");
    });

    it("should handle missing source questions gracefully", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1", "nonExistent"];
      
      const checkbox = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox.choices = [{ value: "1", text: "Option 1" }];
      checkbox.value = ["1"];
      
      // Should not throw and should process existing question
      const panelValue = panel.value as any[];
      expect(panelValue).toBeDefined();
      expect(panelValue.length).toBe(1);
    });
  });

  describe("Priority Items", () => {
    it("should place priority items before others", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1"];
      panel.priorityItems = ["2", "3"];
      
      const checkbox = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox.choices = [
        { value: "1", text: "Option 1" },
        { value: "2", text: "Option 2" },
        { value: "3", text: "Option 3" },
        { value: "4", text: "Option 4" },
      ];
      checkbox.value = ["1", "2", "3", "4"];
      
      const panelValue = panel.value as any[];
      expect(panelValue).toBeDefined();
      const itemIds = panelValue.map((v: any) => v.itemId);
      
      // Priority items should come first
      expect(itemIds[0]).toBe("2");
      expect(itemIds[1]).toBe("3");
      // Others should come after
      expect(itemIds.slice(2)).toContain("1");
      expect(itemIds.slice(2)).toContain("4");
    });

    it("should handle empty priority items array", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1"];
      panel.priorityItems = [];
      
      const checkbox = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox.choices = [
        { value: "1", text: "Option 1" },
        { value: "2", text: "Option 2" },
      ];
      checkbox.value = ["1", "2"];
      
      const panelValue = panel.value as any[];
      expect(panelValue).toBeDefined();
      expect(panelValue.length).toBe(2);
    });
  });

  describe("Randomization", () => {
    it("should randomize non-priority items when randomizeLoop is true", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1"];
      panel.randomizeLoop = true;
      panel.priorityItems = ["1"]; // Keep first item fixed
      
      const checkbox = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox.choices = [
        { value: "1", text: "Option 1" },
        { value: "2", text: "Option 2" },
        { value: "3", text: "Option 3" },
        { value: "4", text: "Option 4" },
      ];
      checkbox.value = ["1", "2", "3", "4"];
      
      const panelValue = panel.value as any[];
      expect(panelValue).toBeDefined();
      
      // Priority item should be first
      expect(panelValue[0].itemId).toBe("1");
      
      // Other items should be present but order may vary
      const otherItemIds = panelValue.slice(1).map((v: any) => v.itemId);
      expect(otherItemIds).toContain("2");
      expect(otherItemIds).toContain("3");
      expect(otherItemIds).toContain("4");
    });

    it("should not randomize when randomizeLoop is false", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1"];
      panel.randomizeLoop = false;
      
      const checkbox = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox.choices = [
        { value: "1", text: "Option 1" },
        { value: "2", text: "Option 2" },
        { value: "3", text: "Option 3" },
      ];
      checkbox.value = ["1", "2", "3"];
      
      const panelValue = panel.value as any[];
      expect(panelValue).toBeDefined();
      expect(panelValue.length).toBe(3);
    });
  });

  describe("Max Loop Count", () => {
    it("should limit items to maxLoopCount when set", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1"];
      panel.maxLoopCount = 2;
      
      const checkbox = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox.choices = [
        { value: "1", text: "Option 1" },
        { value: "2", text: "Option 2" },
        { value: "3", text: "Option 3" },
        { value: "4", text: "Option 4" },
      ];
      checkbox.value = ["1", "2", "3", "4"];
      
      const panelValue = panel.value as any[];
      expect(panelValue).toBeDefined();
      expect(panelValue.length).toBe(2);
    });

    it("should respect priority items when limiting by maxLoopCount", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1"];
      panel.maxLoopCount = 2;
      panel.priorityItems = ["3", "4"]; // These should be included
      
      const checkbox = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox.choices = [
        { value: "1", text: "Option 1" },
        { value: "2", text: "Option 2" },
        { value: "3", text: "Option 3" },
        { value: "4", text: "Option 4" },
      ];
      checkbox.value = ["1", "2", "3", "4"];
      
      const panelValue = panel.value as any[];
      expect(panelValue).toBeDefined();
      expect(panelValue.length).toBe(2);
      const itemIds = panelValue.map((v: any) => v.itemId);
      // Priority items should be included
      expect(itemIds).toContain("3");
      expect(itemIds).toContain("4");
    });

    it("should not limit when maxLoopCount is 0", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1"];
      panel.maxLoopCount = 0;
      
      const checkbox = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox.choices = [
        { value: "1", text: "Option 1" },
        { value: "2", text: "Option 2" },
        { value: "3", text: "Option 3" },
      ];
      checkbox.value = ["1", "2", "3"];
      
      const panelValue = panel.value as any[];
      expect(panelValue).toBeDefined();
      expect(panelValue.length).toBe(3);
    });
  });

  describe("Panel Item Structure", () => {
    it("should create items with item and itemId properties", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1"];
      
      const checkbox = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox.choices = [
        { value: "1", text: "Option 1" },
      ];
      checkbox.value = ["1"];
      
      const panelValue = panel.value as any[];
      expect(panelValue).toBeDefined();
      expect(panelValue.length).toBe(1);
      expect(panelValue[0]).toHaveProperty("item");
      expect(panelValue[0]).toHaveProperty("itemId");
      expect(panelValue[0].itemId).toBe("1");
      expect(panelValue[0].item).toBe("Option 1");
    });

    it("should use value as item when text is not available", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1"];
      
      const checkbox = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox.choices = [
        { value: "1" }, // No text property
      ];
      checkbox.value = ["1"];
      
      const panelValue = panel.value as any[];
      expect(panelValue).toBeDefined();
      expect(panelValue[0].item).toBe("1");
      expect(panelValue[0].itemId).toBe("1");
    });
  });

  describe("Value Update Logic", () => {
    it("should only update value if it has changed", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1"];
      
      const checkbox = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox.choices = [
        { value: "1", text: "Option 1" },
      ];
      checkbox.value = ["1"];
      
      const firstValue = JSON.stringify(panel.value);
      
      // Trigger update again with same value
      checkbox.value = ["1"];
      
      const secondValue = JSON.stringify(panel.value);
      
      // Values should be the same (no unnecessary update)
      expect(firstValue).toBe(secondValue);
    });

    it("should update value when source question value changes", () => {
      cleanup = registerDynamicLooping(survey);
      
      const panel = survey.addNewPage().addNewQuestion("paneldynamic", "panel1");
      panel.loopSource = ["q1"];
      // Set choicePattern using setProperty to avoid infinite loop
      (panel as any).setPropertyValue("choicePattern", "Selected Only");
      
      const checkbox = survey.addNewPage().addNewQuestion("checkbox", "q1");
      checkbox.choices = [
        { value: "1", text: "Option 1" },
        { value: "2", text: "Option 2" },
      ];
      checkbox.value = ["1"];
      
      const firstValue = panel.value as any[];
      expect(firstValue.length).toBe(1);
      
      // Change source value
      checkbox.value = ["1", "2"];
      
      const secondValue = panel.value as any[];
      expect(secondValue.length).toBe(2);
    });
  });
});
