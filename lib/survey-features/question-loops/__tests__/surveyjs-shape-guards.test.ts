import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FunctionFactory, PanelModel, Question, SurveyModel } from "survey-core";
import { registerQuestionLoopsGlobals } from "../infrastructure/registry";

const PROBE_FUNCTION_NAMES = ["h938ProbeContext", "h938ProbeIndex"];

/**
 * Shape guards for the SurveyJS behaviour question-loops nesting depends on (h938).
 *
 * These assert vendor behaviour, not our code. They exist so a survey-core upgrade
 * fails loudly here instead of silently breaking nested loops at runtime.
 * See `.agents/skills/bump-surveyjs/SKILL.md`.
 */

const NESTED_SCHEMA = {
  pages: [
    {
      elements: [
        { type: "checkbox", name: "outerSource", choices: ["a", "b"] },
        {
          type: "paneldynamic",
          name: "outerLoop",
          templateElements: [
            { type: "checkbox", name: "innerSource", choices: ["x", "y", "z"] },
            {
              type: "paneldynamic",
              name: "innerLoop",
              templateElements: [{ type: "rating", name: "r" }],
              loopSource: ["innerSource"],
            },
          ],
          loopSource: ["outerSource"],
        },
      ],
    },
  ],
};

type PanelItemData = {
  getVariableName: () => string;
  findQuestionByName: (name: string) => Question | undefined | null;
};

function buildNestedSurvey(): {
  survey: SurveyModel;
  outerLoop: Question & { panels: PanelModel[] };
} {
  const survey = new SurveyModel(NESTED_SCHEMA);
  const outerLoop = survey.getQuestionByName("outerLoop") as Question & {
    panels: PanelModel[];
    value: unknown;
  };
  // Drive panel creation the way the feature does: assign the panel value.
  outerLoop.value = [
    { itemText: "a", itemValue: "a", loopIndex: 0 },
    { itemText: "b", itemValue: "b", loopIndex: 1 },
  ];
  outerLoop.panels[0].getQuestionByName("innerSource").value = ["x", "z"];
  outerLoop.panels[1].getQuestionByName("innerSource").value = ["y"];
  return { survey, outerLoop };
}

beforeAll(() => {
  registerQuestionLoopsGlobals();
});

afterAll(() => {
  // FunctionFactory is global and outlives this file; leaving probes registered
  // leaks them into every later test in the process.
  for (const name of PROBE_FUNCTION_NAMES) {
    FunctionFactory.Instance.unregister(name);
  }
});

describe("SurveyJS shape guards (h938)", () => {
  it("guard 1: the condition runner exposes `question` with a walkable parentQuestion", () => {
    // arrange
    const calls: Array<{
      hasQuestion: boolean;
      questionName?: string;
      parentQuestionName?: string;
      panelIndex: unknown;
    }> = [];
    FunctionFactory.Instance.register(
      "h938ProbeContext",
      function (this: { question?: Question }, params: unknown[]) {
        calls.push({
          hasQuestion: !!this.question,
          questionName: this.question?.name,
          parentQuestionName: this.question?.parentQuestion?.name,
          panelIndex: params[1],
        });
        return false;
      },
      false,
      false,
    );

    // act
    const survey = new SurveyModel({
      pages: [
        {
          elements: [
            {
              type: "paneldynamic",
              name: "outer",
              panelCount: 2,
              templateElements: [
                {
                  type: "paneldynamic",
                  name: "inner",
                  panelCount: 2,
                  templateElements: [
                    {
                      type: "text",
                      name: "t",
                      visibleIf: "h938ProbeContext('inner', {panelIndex}, 3) = false",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    survey.getQuestionByName("outer");

    // assert
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((call) => call.hasQuestion)).toBe(true);
    expect(calls.every((call) => call.questionName === "t")).toBe(true);
    expect(calls.every((call) => call.parentQuestionName === "inner")).toBe(true);
  });

  it("guard 1b: {panelIndex} is 0-based in expression context", () => {
    // arrange
    const seenIndexes: unknown[] = [];
    FunctionFactory.Instance.register(
      "h938ProbeIndex",
      function (params: unknown[]) {
        seenIndexes.push(params[0]);
        return false;
      },
      false,
      false,
    );

    // act
    const survey = new SurveyModel({
      pages: [
        {
          elements: [
            {
              type: "paneldynamic",
              name: "outer",
              panelCount: 2,
              templateElements: [
                {
                  type: "text",
                  name: "t",
                  visibleIf: "h938ProbeIndex({panelIndex}) = false",
                },
              ],
            },
          ],
        },
      ],
    });
    survey.getQuestionByName("outer");

    // assert — 0-based, matching options.panelIndex from onDynamicPanelValueChanged
    expect(seenIndexes).toContain(0);
    expect(seenIndexes).not.toContain(2);
  });

  it("guard 2: a nested loop's own `data` is the containing panel item, and resolves panel-scoped names", () => {
    // arrange
    const { survey, outerLoop } = buildNestedSurvey();
    const innerLoopInPanel0 = outerLoop.panels[0].getQuestionByName("innerLoop");
    const innerLoopInPanel1 = outerLoop.panels[1].getQuestionByName("innerLoop");

    // act
    const data0 = innerLoopInPanel0.data as unknown as PanelItemData;
    const data1 = innerLoopInPanel1.data as unknown as PanelItemData;

    // assert — asserted from the inner paneldynamic itself, not from a leaf question
    expect(data0).toBeTruthy();
    expect(data0).not.toBe(survey);
    expect(data0.getVariableName()).toBe("panel");

    // panel-scoped names resolve to the sibling in THIS panel instance
    expect([...(data0.findQuestionByName("panel.innerSource")?.value ?? [])]).toEqual(["x", "z"]);
    expect([...(data1.findQuestionByName("panel.innerSource")?.value ?? [])]).toEqual(["y"]);

    // bare names fall through to the survey, not to the panel
    expect(data0.findQuestionByName("innerSource")).toBeFalsy();
    expect(data0.findQuestionByName("outerSource")?.name).toBe("outerSource");
  });

  it("guard 3: onDynamicPanelAdded stays silent for programmatic value assignment", () => {
    // arrange
    const survey = new SurveyModel(NESTED_SCHEMA);
    const events: string[] = [];
    survey.onDynamicPanelAdded.add(() => events.push("added"));
    survey.onDynamicPanelRemoved.add(() => events.push("removed"));
    const outerLoop = survey.getQuestionByName("outerLoop") as Question & {
      value: unknown;
    };

    // act — the exact mechanism syncSingleLoopSource uses to create panels
    outerLoop.value = [{ itemText: "a", itemValue: "a", loopIndex: 0 }];

    // assert — panels cannot be discovered by subscribing to lifecycle events
    expect(events).toEqual([]);
  });

  it("guard 3b: assigning survey.data wholesale fires no value events", () => {
    // arrange
    const survey = new SurveyModel(NESTED_SCHEMA);
    const events: string[] = [];
    survey.onValueChanged.add((_s, options) => events.push(`value:${options.name}`));
    survey.onDynamicPanelValueChanged.add(() => events.push("dynamicPanel"));

    // act
    survey.data = {
      outerSource: ["a"],
      outerLoop: [{ itemText: "a", itemValue: "a", loopIndex: 0, innerSource: ["x"] }],
    };

    // assert — this is why the feature must be bound *after* data is assigned:
    // there is no event it could hydrate from otherwise
    expect(events).toEqual([]);
  });

  it("guard 4: exitMeta does not leak into a template-instantiated question's JSON", () => {
    // arrange
    const { outerLoop } = buildNestedSurvey();
    const innerLoop = outerLoop.panels[0].getQuestionByName("innerLoop") as Question & {
      exitMeta: unknown;
    };

    // act
    innerLoop.exitMeta = { exitCurrent: { triggeredIndexMap: { 0: 1 } } };
    const json = innerLoop.toJSON();

    // assert
    expect(json.exitMeta).toBeUndefined();
  });

  it("guard 6: PanelModel walk still resolves a sibling, as fallback for guard 2", () => {
    // arrange
    const { outerLoop } = buildNestedSurvey();
    const innerLoop = outerLoop.panels[0].getQuestionByName("innerLoop");

    // act
    const parent = innerLoop.parent as PanelModel;
    const sibling = parent?.getQuestionByName("innerSource");

    // assert
    expect(parent).toBeInstanceOf(PanelModel);
    expect([...(sibling?.value ?? [])]).toEqual(["x", "z"]);
    // the panel knows which question owns it — the walk-up primitive
    expect((parent as unknown as { parentQuestion?: Question }).parentQuestion?.name).toBe(
      "outerLoop",
    );
  });
});
