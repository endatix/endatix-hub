import { beforeAll, describe, expect, it } from "vitest";
import { PanelModel, Question, SurveyModel } from "survey-core";
import { registerQuestionLoopsGlobals } from "../../infrastructure/registry";
import {
  loopInPlainPanelSchema,
  nestedLoopSurveySchema,
  panelScopedNestedSchema,
} from "../../__tests__/fixtures/nested-loop-survey";
import {
  collectLoopInstances,
  collectLoopsInPanel,
  collectLoopTemplates,
  collectRootLoopInstances,
  getLoopDepth,
  isLoopQuestion,
  isWithinDepthLimit,
} from "../collect-loop-questions";
import { getLoopQualifiedName } from "../loop-path";

type LoopLike = Question & { value: unknown; panels: PanelModel[] };

beforeAll(() => {
  registerQuestionLoopsGlobals();
});

/** Gives a loop `count` panels without involving the sync pipeline. */
function setPanels(loop: Question, count: number): LoopLike {
  const loopLike = loop as LoopLike;
  loopLike.value = Array.from({ length: count }, (_, index) => ({
    itemText: `item${index}`,
    itemValue: `item${index}`,
    loopIndex: index,
  }));
  return loopLike;
}

function materialise(survey: SurveyModel, loopName: string, count: number) {
  return setPanels(survey.getQuestionByName(loopName)!, count);
}

describe("collectLoopTemplates", () => {
  it("finds a loop declared inside another loop's template", () => {
    // arrange
    const survey = new SurveyModel(nestedLoopSurveySchema as never);

    // act
    const names = collectLoopTemplates(survey).map((loop) => loop.name);

    // assert — survey.getAllQuestions() only ever returned ["question2"]
    expect(names).toEqual(["question2", "question1"]);
  });

  it("finds a loop inside a plain dynamic panel", () => {
    // arrange
    const survey = new SurveyModel(loopInPlainPanelSchema as never);

    // act
    const names = collectLoopTemplates(survey).map((loop) => loop.name);

    // assert — the nesting primitive is any paneldynamic, not a loop
    expect(names).toEqual(["loopInPlain"]);
  });

  it("ignores a paneldynamic with no loopSource", () => {
    // arrange
    const survey = new SurveyModel({
      elements: [
        {
          type: "paneldynamic",
          name: "plain",
          templateElements: [{ type: "text", name: "t" }],
        },
      ],
    });

    // act / assert
    expect(collectLoopTemplates(survey)).toEqual([]);
  });

  it("finds loops nested inside a static panel", () => {
    // arrange
    const survey = new SurveyModel({
      elements: [
        { type: "checkbox", name: "src", choices: ["a"] },
        {
          type: "panel",
          name: "group",
          elements: [
            {
              type: "paneldynamic",
              name: "loopInGroup",
              templateElements: [{ type: "text", name: "t" }],
              loopSource: ["src"],
            },
          ],
        },
      ],
    });

    // act
    const names = collectLoopTemplates(survey).map((loop) => loop.name);

    // assert — a static panel groups elements without adding a nesting level
    expect(names).toEqual(["loopInGroup"]);
    expect(getLoopDepth(collectLoopTemplates(survey)[0])).toBe(1);
  });
});

describe("collectLoopInstances", () => {
  it("finds one inner loop object per outer panel instance", () => {
    // arrange
    const survey = new SurveyModel(panelScopedNestedSchema as never);
    materialise(survey, "outerLoop", 3);

    // act
    const instances = collectLoopInstances(survey);

    // assert — the outer loop plus one inner instance per panel
    expect(instances.filter((loop) => loop.name === "outerLoop")).toHaveLength(1);
    expect(instances.filter((loop) => loop.name === "innerLoop")).toHaveLength(3);
  });

  it("returns distinct objects for each inner instance", () => {
    // arrange
    const survey = new SurveyModel(panelScopedNestedSchema as never);
    const outer = materialise(survey, "outerLoop", 2);

    // act
    const inner0 = outer.panels[0].getQuestionByName("innerLoop");
    const inner1 = outer.panels[1].getQuestionByName("innerLoop");

    // assert
    expect(inner0).not.toBe(inner1);
  });

  it("returns only the declaration before any panels exist", () => {
    // arrange
    const survey = new SurveyModel(panelScopedNestedSchema as never);

    // act
    const names = collectLoopInstances(survey).map((loop) => loop.name);

    // assert — a nested loop has no instance until its container has panels
    expect(names).toEqual(["outerLoop"]);
  });
});

describe("collectRootLoopInstances", () => {
  it("returns only loops not contained by another loop", () => {
    // arrange
    const survey = new SurveyModel(panelScopedNestedSchema as never);
    materialise(survey, "outerLoop", 2);

    // act
    const roots = collectRootLoopInstances(survey);

    // assert — cascade roots; loops below one are reached by walking down
    expect(roots.map((loop) => loop.name)).toEqual(["outerLoop"]);
  });

  it("includes a loop inside a plain dynamic panel", () => {
    // arrange
    const survey = new SurveyModel(loopInPlainPanelSchema as never);

    // act
    const roots = collectRootLoopInstances(survey);

    // assert — nothing cascades from a panel that is not itself a loop, so this
    // loop has to be a root or it never hydrates from saved data
    expect(roots.map((loop) => loop.name)).toEqual([
      "loopInPlain",
      "loopInPlain",
    ]);
  });

  it("descends through a plain panel to reach a loop below a cascade node", () => {
    // arrange
    const survey = new SurveyModel({
      elements: [
        { type: "checkbox", name: "outerSource", choices: ["a"] },
        {
          type: "paneldynamic",
          name: "outerLoop",
          loopSource: ["outerSource"],
          templateElements: [
            {
              type: "paneldynamic",
              name: "plainInner",
              panelCount: 1,
              templateElements: [
                { type: "checkbox", name: "deepSrc", choices: ["x"] },
                {
                  type: "paneldynamic",
                  name: "deepLoop",
                  loopSource: ["panel.deepSrc"],
                  templateElements: [{ type: "text", name: "t" }],
                },
              ],
            },
          ],
        },
      ],
    });
    const outer = materialise(survey, "outerLoop", 1);

    // act — descent from the outer loop's panel, not from the survey
    const reachable = collectLoopsInPanel(outer.panels[0]);

    // assert — the plain panel is a pass-through, not a dead end
    expect(reachable.map((loop) => loop.name)).toEqual(["deepLoop"]);
  });
});

describe("collectLoopsInPanel", () => {
  it("finds the loops living in one panel instance", () => {
    // arrange
    const survey = new SurveyModel(panelScopedNestedSchema as never);
    const outer = materialise(survey, "outerLoop", 2);

    // act
    const found = collectLoopsInPanel(outer.panels[1]);

    // assert
    expect(found.map((loop) => loop.name)).toEqual(["innerLoop"]);
    expect(found[0]).toBe(outer.panels[1].getQuestionByName("innerLoop"));
  });
});

describe("loop depth", () => {
  it("reports 1 for a page-level loop and 2 for one inside a panel", () => {
    // arrange
    const survey = new SurveyModel(panelScopedNestedSchema as never);
    const outer = materialise(survey, "outerLoop", 1);
    const inner = outer.panels[0].getQuestionByName("innerLoop");

    // act / assert
    expect(getLoopDepth(outer)).toBe(1);
    expect(getLoopDepth(inner)).toBe(2);
    expect(isWithinDepthLimit(outer)).toBe(true);
    expect(isWithinDepthLimit(inner)).toBe(true);
  });

  it("reports depth 3 as beyond the limit", () => {
    // arrange
    const survey = new SurveyModel({
      elements: [
        { type: "checkbox", name: "s1", choices: ["a"] },
        {
          type: "paneldynamic",
          name: "l1",
          loopSource: ["s1"],
          templateElements: [
            { type: "checkbox", name: "s2", choices: ["b"] },
            {
              type: "paneldynamic",
              name: "l2",
              loopSource: ["panel.s2"],
              templateElements: [
                { type: "checkbox", name: "s3", choices: ["c"] },
                {
                  type: "paneldynamic",
                  name: "l3",
                  loopSource: ["panel.s3"],
                  templateElements: [{ type: "text", name: "t" }],
                },
              ],
            },
          ],
        },
      ],
    });
    const l1 = materialise(survey, "l1", 1);
    const l2 = setPanels(l1.panels[0].getQuestionByName("l2"), 1);
    const l3 = l2.panels[0].getQuestionByName("l3");

    // act / assert
    expect(getLoopDepth(l3)).toBe(3);
    expect(isWithinDepthLimit(l3)).toBe(false);
  });
});

describe("isLoopQuestion", () => {
  it("requires a paneldynamic with a non-empty loopSource", () => {
    // arrange
    const survey = new SurveyModel({
      elements: [
        { type: "text", name: "plainText" },
        { type: "paneldynamic", name: "noSource", templateElements: [] },
      ],
    });

    // act / assert
    expect(isLoopQuestion(survey.getQuestionByName("plainText"))).toBe(false);
    expect(isLoopQuestion(survey.getQuestionByName("noSource"))).toBe(false);
    expect(isLoopQuestion(undefined)).toBe(false);
  });
});

describe("getLoopQualifiedName", () => {
  it("returns the bare name for a page-level loop", () => {
    // arrange
    const survey = new SurveyModel(panelScopedNestedSchema as never);
    const outer = materialise(survey, "outerLoop", 2);

    // act / assert
    expect(getLoopQualifiedName(outer)).toBe("outerLoop");
  });

  it("bakes the containing panel index into a nested loop's path", () => {
    // arrange
    const survey = new SurveyModel(panelScopedNestedSchema as never);
    const outer = materialise(survey, "outerLoop", 3);

    // act / assert — this is the path the expression engine actually resolves
    expect(getLoopQualifiedName(outer.panels[0].getQuestionByName("innerLoop"))).toBe(
      "outerLoop[0].innerLoop",
    );
    expect(getLoopQualifiedName(outer.panels[2].getQuestionByName("innerLoop"))).toBe(
      "outerLoop[2].innerLoop",
    );
  });

  it("keeps the ancestor index when a static panel sits between the loops", () => {
    // arrange — a static panel groups elements without adding a dynamic level,
    // so the inner loop's immediate parent is the group, not one of the outer
    // loop's panels
    const survey = new SurveyModel({
      elements: [
        { type: "checkbox", name: "outerSrc", choices: ["a", "b"] },
        {
          type: "paneldynamic",
          name: "outerLoop",
          loopSource: ["outerSrc"],
          templateElements: [
            { type: "checkbox", name: "innerSrc", choices: ["x"] },
            {
              type: "panel",
              name: "group",
              elements: [
                {
                  type: "paneldynamic",
                  name: "innerLoop",
                  loopSource: ["panel.innerSrc"],
                  templateElements: [{ type: "rating", name: "r" }],
                },
              ],
            },
          ],
        },
      ],
    });
    const outer = materialise(survey, "outerLoop", 2);

    // act / assert — without walking past the group the prefix would be lost,
    // and every exit condition on this loop would silently evaluate false
    expect(getLoopQualifiedName(outer.panels[1].getQuestionByName("innerLoop"))).toBe(
      "outerLoop[1].innerLoop",
    );
  });

  it("handles a missing question without throwing", () => {
    expect(getLoopQualifiedName(undefined as never)).toBe("");
  });
});
