import { describe, expect, it, vi } from "vitest";
import {
  createLoopExitCommand,
  createLoopExitQuery,
  handleLoopExit,
} from "../use-cases/handle-loop-exit";
import { DynamicLoopModel, LoopExitMeta } from "../types";
import { PANEL_VISIBILITY_SENTINEL } from "../dynamic-loop-question";

function createMockLoopPanel(
  overrides: Partial<DynamicLoopModel> = {},
): DynamicLoopModel {
  return {
    getType: () => "paneldynamic",
    name: "loopPanel",
    loopSource: ["item1"],
    exitMeta: undefined,
    ...overrides,
  } as unknown as DynamicLoopModel;
}

describe("createLoopExitCommand", () => {
  describe("processExitAll", () => {
    it("sets exitAll when shouldExitAll is true and state was empty", () => {
      const panel = createMockLoopPanel();
      const command = createLoopExitCommand(panel);

      command.processExitAll(true, 1);
      const applied = command.apply();

      expect(applied).toBe(true);
      expect(panel.exitMeta?.exitAll).toEqual({ triggeredPanelIndex: 1 });
    });

    it("updates exitAll when new panelIndex is greater than previous", () => {
      const panel = createMockLoopPanel({
        exitMeta: { exitAll: { triggeredPanelIndex: 3 } },
      });
      const command = createLoopExitCommand(panel);

      command.processExitAll(true, 1);
      command.apply();

      expect(panel.exitMeta?.exitAll).toEqual({ triggeredPanelIndex: 1 });
    });

    it("does not update exitAll when new panelIndex is higher than current", () => {
      const panel = createMockLoopPanel({
        exitMeta: { exitAll: { triggeredPanelIndex: 0 } },
      });
      const command = createLoopExitCommand(panel);

      command.processExitAll(true, 2);
      command.apply();

      expect(panel.exitMeta?.exitAll).toEqual({ triggeredPanelIndex: 0 });
    });

    it("clears exitAll when shouldExitAll is false for same panelIndex", () => {
      const panel = createMockLoopPanel({
        exitMeta: { exitAll: { triggeredPanelIndex: 1 } },
      });
      const command = createLoopExitCommand(panel);

      command.processExitAll(false, 1);
      command.apply();

      expect(panel.exitMeta?.exitAll).toBeUndefined();
    });
  });

  describe("processExitCurrent", () => {
    it("sets exitCurrent.triggeredIndexMap when shouldExitCurrent is true", () => {
      const panel = createMockLoopPanel();
      const command = createLoopExitCommand(panel);

      command.processExitCurrent(true, 0, 2);
      command.apply();

      expect(panel.exitMeta?.exitCurrent?.triggeredIndexMap).toEqual({ 0: 2 });
    });

    it("updates triggeredIndexMap when triggerIndex changes for same panel", () => {
      const panel = createMockLoopPanel({
        exitMeta: {
          exitCurrent: { triggeredIndexMap: { 0: 1 } },
        },
      });
      const command = createLoopExitCommand(panel);

      command.processExitCurrent(true, 0, 3);
      command.apply();

      expect(panel.exitMeta?.exitCurrent?.triggeredIndexMap).toEqual({ 0: 3 });
    });

    it("does not update when triggerIndex is -1", () => {
      const panel = createMockLoopPanel();
      const command = createLoopExitCommand(panel);

      command.processExitCurrent(true, 0, -1);
      command.apply();

      expect(panel.exitMeta?.exitCurrent).toBeUndefined();
    });

    it("clears panel entry when shouldExitCurrent is false for that panel", () => {
      const panel = createMockLoopPanel({
        exitMeta: {
          exitCurrent: { triggeredIndexMap: { 0: 2 } },
        },
      });
      const command = createLoopExitCommand(panel);

      command.processExitCurrent(false, 0, 2);
      command.apply();

      expect(panel.exitMeta?.exitCurrent).toBeUndefined();
    });

    it("removes only the panel index from map when multiple panels have exit current", () => {
      const panel = createMockLoopPanel({
        exitMeta: {
          exitCurrent: { triggeredIndexMap: { 0: 1, 1: 2 } },
        },
      });
      const command = createLoopExitCommand(panel);

      command.processExitCurrent(false, 0, 1);
      command.apply();

      expect(panel.exitMeta?.exitCurrent?.triggeredIndexMap).toEqual({ 1: 2 });
    });
  });

  describe("apply", () => {
    it("returns false when no state changed", () => {
      const panel = createMockLoopPanel();
      const command = createLoopExitCommand(panel);

      const applied = command.apply();

      expect(applied).toBe(false);
    });
  });
});

describe("createLoopExitQuery", () => {
  describe("isExited", () => {
    it("returns false when state is undefined", () => {
      const query = createLoopExitQuery(undefined);

      expect(query.isExited(0, 0)).toBe(false);
      expect(query.isExited(5, 3)).toBe(false);
    });

    it("returns true for panels after exitAll.triggeredPanelIndex", () => {
      const state: LoopExitMeta = {
        exitAll: { triggeredPanelIndex: 1 },
      };
      const query = createLoopExitQuery(state);

      expect(query.isExited(0, 0)).toBe(false);
      expect(query.isExited(1, 0)).toBe(false);
      expect(query.isExited(2, 0)).toBe(true);
      expect(query.isExited(3, 0)).toBe(true);
    });

    it("returns false for panel visibility sentinel (questionIndex 9999)", () => {
      const state: LoopExitMeta = {
        exitCurrent: { triggeredIndexMap: { 0: 0 } },
      };
      const query = createLoopExitQuery(state);

      expect(query.isExited(0, PANEL_VISIBILITY_SENTINEL)).toBe(false);
    });

    it("returns true for questions after trigger in same panel when exitCurrent is set", () => {
      const state: LoopExitMeta = {
        exitCurrent: { triggeredIndexMap: { 0: 1 } },
      };
      const query = createLoopExitQuery(state);

      expect(query.isExited(0, 0)).toBe(false);
      expect(query.isExited(0, 1)).toBe(false);
      expect(query.isExited(0, 2)).toBe(true);
      expect(query.isExited(0, 3)).toBe(true);
    });

    it("returns false for other panels when only one panel has exitCurrent", () => {
      const state: LoopExitMeta = {
        exitCurrent: { triggeredIndexMap: { 1: 2 } },
      };
      const query = createLoopExitQuery(state);

      expect(query.isExited(0, 5)).toBe(false);
      expect(query.isExited(1, 1)).toBe(false);
      expect(query.isExited(1, 3)).toBe(true);
    });
  });
});

describe("handleLoopExit", () => {
  it("returns early when question is not a loop question", () => {
    const runCondition = vi.fn();
    const runExpressions = vi.fn();
    const sender = {
      runCondition,
      runExpressions,
    } as unknown as import("survey-core").SurveyModel;
    const panel = createMockLoopPanel();
    (panel as { getType?: () => string }).getType = () => "text";
    const options = {
      question: panel,
      panelIndex: 0,
      name: "q1",
      panel: { questions: [{ name: "q1" }] },
    } as unknown as import("survey-core").DynamicPanelItemValueChangedEvent;

    handleLoopExit(sender, options);

    expect(runCondition).not.toHaveBeenCalled();
    expect(runExpressions).not.toHaveBeenCalled();
  });

  it("returns early when both exit conditions are empty", () => {
    const runCondition = vi.fn();
    const runExpressions = vi.fn();
    const sender = {
      runCondition,
      runExpressions,
    } as unknown as import("survey-core").SurveyModel;
    const panel = createMockLoopPanel({
      exitLoopCondition: undefined,
      exitAllLoopsCondition: undefined,
    });
    const options = {
      question: panel,
      panelIndex: 0,
      name: "q1",
      panel: { questions: [{ name: "q1" }] },
    } as unknown as import("survey-core").DynamicPanelItemValueChangedEvent;

    handleLoopExit(sender, options);

    expect(runCondition).not.toHaveBeenCalled();
    expect(runExpressions).not.toHaveBeenCalled();
  });

  it("evaluates exitAllLoopsCondition and updates exitMeta when true", () => {
    const runCondition = vi.fn().mockReturnValue(true);
    const runExpressions = vi.fn();
    const sender = {
      runCondition,
      runExpressions,
    } as unknown as import("survey-core").SurveyModel;
    const panel = createMockLoopPanel({
      exitAllLoopsCondition: "{panel.x} = 1",
    });
    const options = {
      question: panel,
      panelIndex: 0,
      name: "q1",
      panel: { questions: [{ name: "q1" }] },
    } as unknown as import("survey-core").DynamicPanelItemValueChangedEvent;

    handleLoopExit(sender, options);

    expect(runCondition).toHaveBeenCalled();
    expect(panel.exitMeta?.exitAll).toEqual({ triggeredPanelIndex: 0 });
    expect(runExpressions).toHaveBeenCalled();
  });

  it("evaluates exitLoopCondition and updates exitMeta when true", () => {
    const runCondition = vi.fn().mockReturnValue(true);
    const runExpressions = vi.fn();
    const sender = {
      runCondition,
      runExpressions,
    } as unknown as import("survey-core").SurveyModel;
    const panel = createMockLoopPanel({
      exitLoopCondition: "{panel.rate} = 5",
      exitAllLoopsCondition: undefined,
    });
    const options = {
      question: panel,
      panelIndex: 0,
      name: "triggerQ",
      panel: {
        questions: [{ name: "q1" }, { name: "triggerQ" }, { name: "q3" }],
      },
    } as unknown as import("survey-core").DynamicPanelItemValueChangedEvent;

    handleLoopExit(sender, options);

    expect(runCondition).toHaveBeenCalled();
    expect(panel.exitMeta?.exitCurrent?.triggeredIndexMap).toEqual({ 0: 1 });
    expect(runExpressions).toHaveBeenCalled();
  });

  it("does not call runExpressions when state does not change", () => {
    const runCondition = vi.fn().mockReturnValue(false);
    const runExpressions = vi.fn();
    const sender = {
      runCondition,
      runExpressions,
    } as unknown as import("survey-core").SurveyModel;
    const panel = createMockLoopPanel({
      exitAllLoopsCondition: "{panel.x} = 1",
    });
    const options = {
      question: panel,
      panelIndex: 0,
      name: "q1",
      panel: { questions: [{ name: "q1" }] },
    } as unknown as import("survey-core").DynamicPanelItemValueChangedEvent;

    handleLoopExit(sender, options);

    expect(runCondition).toHaveBeenCalled();
    expect(runExpressions).not.toHaveBeenCalled();
  });
});
