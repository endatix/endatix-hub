import { beforeAll, describe, expect, it } from "vitest";
import { PanelModel, Question, SurveyModel } from "survey-core";
import { registerQuestionLoopsGlobals } from "../../infrastructure/registry";
import {
  innerLoopFromTopLevelSchema,
  panelScopedNestedSchema,
  shadowedSourceNameSchema,
} from "../../__tests__/fixtures/nested-loop-survey";
import {
  resolveLoopSource,
  resolveLoopSourceQuestions,
} from "../resolve-loop-source";

type LoopLike = Question & { value: unknown; panels: PanelModel[] };

beforeAll(() => {
  registerQuestionLoopsGlobals();
});

/** Materialises outer panels without involving the sync pipeline. */
function buildOuterPanels(survey: SurveyModel, loopName: string, count: number) {
  const loop = survey.getQuestionByName(loopName) as LoopLike;
  loop.value = Array.from({ length: count }, (_, index) => ({
    itemText: `item${index}`,
    itemValue: `item${index}`,
    loopIndex: index,
  }));
  return loop;
}

describe("resolveLoopSource", () => {
  it("resolves a panel-scoped name to the sibling in the loop's own panel", () => {
    // arrange
    const survey = new SurveyModel(panelScopedNestedSchema as never);
    const outer = buildOuterPanels(survey, "outerLoop", 2);
    outer.panels[0].getQuestionByName("innerSource").value = ["x", "z"];
    outer.panels[1].getQuestionByName("innerSource").value = ["y"];
    const innerLoop0 = outer.panels[0].getQuestionByName("innerLoop");
    const innerLoop1 = outer.panels[1].getQuestionByName("innerLoop");

    // act
    const resolved0 = resolveLoopSource(innerLoop0, "panel.innerSource");
    const resolved1 = resolveLoopSource(innerLoop1, "panel.innerSource");

    // assert — each instance sees its own sibling, not a shared one
    expect([...(resolved0?.value ?? [])]).toEqual(["x", "z"]);
    expect([...(resolved1?.value ?? [])]).toEqual(["y"]);
  });

  it("resolves a bare name to the sibling in the loop's own panel", () => {
    // arrange — the reported JSON uses bare names
    const survey = new SurveyModel(panelScopedNestedSchema as never);
    const outer = buildOuterPanels(survey, "outerLoop", 1);
    outer.panels[0].getQuestionByName("innerSource").value = ["x"];
    const innerLoop = outer.panels[0].getQuestionByName("innerLoop");

    // act
    const resolved = resolveLoopSource(innerLoop, "innerSource");

    // assert
    expect(resolved?.name).toBe("innerSource");
    expect([...(resolved?.value ?? [])]).toEqual(["x"]);
  });

  it("falls back to the survey root for a bare name with no sibling match", () => {
    // arrange
    const survey = new SurveyModel(innerLoopFromTopLevelSchema as never);
    survey.getQuestionByName("topLevelSource")!.value = ["x", "y"];
    const outer = buildOuterPanels(survey, "outerLoop", 1);
    const innerLoop = outer.panels[0].getQuestionByName("innerLoop");

    // act
    const resolved = resolveLoopSource(innerLoop, "topLevelSource");

    // assert
    expect(resolved?.name).toBe("topLevelSource");
    expect([...(resolved?.value ?? [])]).toEqual(["x", "y"]);
  });

  it("prefers the innermost scope when a bare name is shadowed", () => {
    // arrange — "shared" exists both at page level and inside the panel
    const survey = new SurveyModel(shadowedSourceNameSchema as never);
    survey.getQuestionByName("shared")!.value = ["top1", "top2"];
    const outer = buildOuterPanels(survey, "outerLoop", 1);
    outer.panels[0].getQuestionByName("shared").value = ["in1"];
    const innerLoop = outer.panels[0].getQuestionByName("innerLoop");

    // act
    const resolved = resolveLoopSource(innerLoop, "shared");

    // assert — the sibling wins, standard lexical scoping
    expect([...(resolved?.value ?? [])]).toEqual(["in1"]);
  });

  it("resolves a page-level loop's source unchanged", () => {
    // arrange
    const survey = new SurveyModel({
      elements: [
        { type: "checkbox", name: "brands", choices: ["kia", "honda"] },
        {
          type: "paneldynamic",
          name: "loop",
          templateElements: [{ type: "text", name: "t" }],
          loopSource: ["brands"],
        },
      ],
    });
    const loop = survey.getQuestionByName("loop")!;
    survey.getQuestionByName("brands")!.value = ["kia"];

    // act
    const resolved = resolveLoopSource(loop, "brands");

    // assert
    expect(resolved?.name).toBe("brands");
  });

  it("returns undefined for an unresolvable name", () => {
    // arrange
    const survey = new SurveyModel(panelScopedNestedSchema as never);
    const outer = buildOuterPanels(survey, "outerLoop", 1);
    const innerLoop = outer.panels[0].getQuestionByName("innerLoop");

    // act / assert
    expect(resolveLoopSource(innerLoop, "nothingNamedThis")).toBeUndefined();
    expect(resolveLoopSource(innerLoop, "")).toBeUndefined();
  });
});

describe("resolveLoopSourceQuestions", () => {
  it("resolves a mix of sibling and top-level sources on one loop", () => {
    // arrange
    const survey = new SurveyModel({
      elements: [
        { type: "checkbox", name: "outerSource", choices: ["a"] },
        { type: "checkbox", name: "topLevelSource", choices: ["t1", "t2"] },
        {
          type: "paneldynamic",
          name: "outerLoop",
          templateElements: [
            { type: "checkbox", name: "innerSource", choices: ["x", "y"] },
            {
              type: "paneldynamic",
              name: "innerLoop",
              templateElements: [{ type: "rating", name: "r" }],
              loopSource: ["panel.innerSource", "topLevelSource"],
            },
          ],
          loopSource: ["outerSource"],
        },
      ],
    });
    const outer = buildOuterPanels(survey, "outerLoop", 1);
    const innerLoop = outer.panels[0].getQuestionByName("innerLoop");

    // act
    const resolved = resolveLoopSourceQuestions(innerLoop as never);

    // assert
    expect(resolved.map((question) => question.name)).toEqual([
      "innerSource",
      "topLevelSource",
    ]);
  });

  it("drops entries that cannot be resolved rather than throwing", () => {
    // arrange
    const survey = new SurveyModel(panelScopedNestedSchema as never);
    const outer = buildOuterPanels(survey, "outerLoop", 1);
    const innerLoop = outer.panels[0].getQuestionByName("innerLoop") as Question & {
      loopSource: string[];
    };
    innerLoop.loopSource = ["panel.innerSource", "doesNotExist"];

    // act
    const resolved = resolveLoopSourceQuestions(innerLoop as never);

    // assert
    expect(resolved.map((question) => question.name)).toEqual(["innerSource"]);
  });

  it("returns an empty array when loopSource is missing", () => {
    // arrange
    const survey = new SurveyModel({
      elements: [{ type: "paneldynamic", name: "p", templateElements: [] }],
    });
    const panel = survey.getQuestionByName("p")!;

    // act / assert
    expect(resolveLoopSourceQuestions(panel as never)).toEqual([]);
  });
});
