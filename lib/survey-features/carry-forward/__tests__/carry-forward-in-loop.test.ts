import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Model, type Question } from "survey-core";
import { registerQuestionLoopsGlobals } from "@/lib/survey-features/question-loops/infrastructure/registry";
import { bindFeatureToSurvey as bindQuestionLoops } from "@/lib/survey-features/question-loops/infrastructure/survey-bindings";
import type { PanelItem } from "@/lib/survey-features/question-loops/types";
import { registerAdvancedCarryForwardGlobals } from "../infrastructure/registry";
import {
  bindAdvancedCarryForwardToSurvey,
  clearAdvancedCarryForwardBindingsForTests,
} from "../infrastructure/survey-bindings";
import { resetCarryForwardUpdateGuardForTests } from "../infrastructure/carry-forward-sync";
import {
  LOOP_ITEMS,
  LOOP_NAME,
  LOOP_SOURCE_NAME,
  LOOP_TARGET_NAME,
  OUTSIDE_TARGET_NAME,
  SOURCE_NAME,
  carryForwardLoopSurvey,
} from "./fixtures/carry-forward-loop-survey";

type PanelDynamic = Question & {
  panels: Array<{ getQuestionByName: (name: string) => Question }>;
};

const disposers: Array<() => void> = [];

/** Builds the model with Q4 answered, binding the two features in `order`. */
function loadSurvey(
  order: "loops-first" | "carry-forward-first",
  answer: string[] = ["1", "2", "4", "5"],
): Model {
  const model = new Model(carryForwardLoopSurvey());
  model.setValue(SOURCE_NAME, answer);
  const binds = [
    () => bindQuestionLoops(model),
    () => bindAdvancedCarryForwardToSurvey(model),
  ];
  if (order === "carry-forward-first") binds.reverse();
  for (const bind of binds) disposers.push(bind());
  return model;
}

function choiceValues(question: Question): unknown[] {
  return (
    question as unknown as { choices: Array<{ value: unknown }> }
  ).choices.map((choice) => choice.value);
}

function loopTargets(model: Model): Question[] {
  const loop = model.getQuestionByName(LOOP_NAME) as PanelDynamic;
  return loop.panels.map((panel) => panel.getQuestionByName(LOOP_TARGET_NAME));
}

function dependentsOf(model: Model, name: string): Question[] {
  const source = model.getQuestionByName(name) as unknown as {
    dependedQuestions: Question[];
  };
  return source.dependedQuestions;
}

/** The question's methods are its class's again: nothing still wraps them. */
function expectNoCarryForwardPatches(question: Question): void {
  const patched = question as unknown as Record<string, unknown>;
  const prototype = Object.getPrototypeOf(question);
  expect(patched.dispose).toBe(prototype.dispose);
  expect(patched.updateDependedQuestion).toBe(prototype.updateDependedQuestion);
}

function outsideTarget(model: Model): Question {
  return model.getQuestionByName(OUTSIDE_TARGET_NAME)!;
}

/** Selected Q4 choices, priority item first, cut to the max choices. */
const EXPECTED = ["4", "1"];

describe("Carry-forward inside a question loop (hub#1384 regression)", () => {
  beforeAll(() => {
    registerQuestionLoopsGlobals();
    registerAdvancedCarryForwardGlobals();
  });

  beforeEach(() => {
    clearAdvancedCarryForwardBindingsForTests();
    resetCarryForwardUpdateGuardForTests();
  });

  afterEach(() => {
    disposers.splice(0).forEach((dispose) => dispose());
  });

  it("keeps carrying choices into the question outside the loop", () => {
    const model = loadSurvey("loops-first");

    expect(choiceValues(outsideTarget(model))).toEqual(EXPECTED);
  });

  it.each(["loops-first", "carry-forward-first"] as const)(
    "carries choices into every loop panel (%s)",
    (order) => {
      const model = loadSurvey(order);
      const targets = loopTargets(model);

      expect(targets).toHaveLength(LOOP_ITEMS.length);
      for (const target of targets) {
        expect(choiceValues(target)).toEqual(EXPECTED);
      }
    },
  );

  it.each(["loops-first", "carry-forward-first"] as const)(
    "updates every loop panel when the source answer changes (%s)",
    (order) => {
      const model = loadSurvey(order);

      model.setValue(SOURCE_NAME, ["3", "5"]);

      for (const target of loopTargets(model)) {
        expect(choiceValues(target)).toEqual(["3", "5"]);
      }
      expect(choiceValues(outsideTarget(model))).toEqual(["3", "5"]);
    },
  );

  it("carries choices into a loop panel created after load", () => {
    const model = loadSurvey("loops-first");
    model.setValue(LOOP_SOURCE_NAME, ["A"]);
    expect(loopTargets(model)).toHaveLength(1);

    model.setValue(LOOP_SOURCE_NAME, [...LOOP_ITEMS]);

    const targets = loopTargets(model);
    expect(targets).toHaveLength(LOOP_ITEMS.length);
    for (const target of targets) {
      expect(choiceValues(target)).toEqual(EXPECTED);
    }
  });

  it("stops syncing the questions of a panel the loop drops", () => {
    const model = loadSurvey("loops-first");
    const dropped = loopTargets(model).at(-1)!;
    const kept = (model.getQuestionByName(LOOP_NAME).value as PanelItem[])[0]!;

    model.setValue(LOOP_SOURCE_NAME, [kept.itemValue]);

    expect(dependentsOf(model, SOURCE_NAME)).toEqual(
      expect.arrayContaining([outsideTarget(model), ...loopTargets(model)]),
    );
    expect(dependentsOf(model, SOURCE_NAME)).not.toContain(dropped);
    expect(dependentsOf(model, SOURCE_NAME)).toHaveLength(2);
    expectNoCarryForwardPatches(dropped);
  });

  it("leaves no carry-forward patches on its targets once unbound", () => {
    const model = loadSurvey("loops-first");
    const targets = [...loopTargets(model), outsideTarget(model)];

    disposers.splice(0).forEach((dispose) => dispose());

    for (const target of targets) expectNoCarryForwardPatches(target);
  });

  it("keeps a saved loop answer when resuming a submission", () => {
    const model = new Model(carryForwardLoopSurvey());
    model.data = {
      [SOURCE_NAME]: ["1", "4"],
      [LOOP_SOURCE_NAME]: ["A"],
      [LOOP_NAME]: [
        { itemValue: "A", itemText: "Topic A", [LOOP_TARGET_NAME]: ["4"] },
      ],
    };
    disposers.push(
      bindQuestionLoops(model),
      bindAdvancedCarryForwardToSurvey(model),
    );

    const [target] = loopTargets(model);
    expect(choiceValues(target!)).toEqual(EXPECTED);
    expect([...target!.value]).toEqual(["4"]);
  });

  it("leaves the loop template's choices as authored in design mode", () => {
    const model = new Model(carryForwardLoopSurvey());
    model.setDesignMode(true);
    const loop = model.getQuestionByName(LOOP_NAME) as PanelDynamic & {
      template: { getQuestionByName: (name: string) => Question };
    };
    const template = loop.template.getQuestionByName(LOOP_TARGET_NAME);
    template.setPropertyValue("choices", ["authored"]);

    disposers.push(bindAdvancedCarryForwardToSurvey(model));

    expect(choiceValues(template)).toEqual(["authored"]);
  });

  it("keeps the panels it still has in sync after the loop drops one", () => {
    const model = loadSurvey("loops-first");
    model.setValue(LOOP_SOURCE_NAME, ["A", "B"]);

    model.setValue(SOURCE_NAME, ["2"]);

    const targets = loopTargets(model);
    expect(targets).toHaveLength(2);
    for (const target of targets) {
      expect(choiceValues(target)).toEqual(["2"]);
    }
  });
});
