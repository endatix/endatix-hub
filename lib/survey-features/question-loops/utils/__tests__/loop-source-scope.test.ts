import { beforeAll, describe, expect, it } from "vitest";
import { SurveyModel } from "survey-core";
import { registerQuestionLoopsGlobals } from "../../infrastructure/registry";
import { DynamicLoopModel } from "../../types";
import {
  getLoopSourceCandidates,
  resolveLoopSourceInScope,
} from "../loop-source-scope";
import { collectLoopTemplates } from "../collect-loop-questions";

/**
 * The designer scope rule (h938). Design mode is where the original trap lived:
 * `survey.getAllQuestions()` returns template elements there, so every loop —
 * nested or top-level — was offered sources it could never resolve at runtime.
 */
const DESIGNER_SCHEMA = {
  pages: [
    {
      elements: [
        { type: "checkbox", name: "topLevel", choices: ["a"] },
        {
          type: "paneldynamic",
          name: "outerLoop",
          templateElements: [
            { type: "checkbox", name: "innerSource", choices: ["x"] },
            { type: "text", name: "notASelect" },
            {
              type: "paneldynamic",
              name: "innerLoop",
              templateElements: [
                { type: "checkbox", name: "deepSource", choices: ["q"] },
              ],
              loopSource: ["panel.innerSource"],
            },
          ],
          loopSource: ["topLevel"],
        },
        {
          type: "paneldynamic",
          name: "unrelated",
          templateElements: [
            { type: "checkbox", name: "unrelatedInner", choices: ["u"] },
          ],
        },
      ],
    },
  ],
};

function buildDesignerSurvey(schema: object): SurveyModel {
  const survey = new SurveyModel();
  survey.setDesignMode(true);
  survey.fromJSON(schema as never);
  return survey;
}

function loopNamed(survey: SurveyModel, name: string): DynamicLoopModel {
  return collectLoopTemplates(survey).find((loop) => loop.name === name)!;
}

beforeAll(() => {
  registerQuestionLoopsGlobals();
});

describe("getLoopSourceCandidates", () => {
  it("offers a top-level loop only page-level questions", () => {
    // arrange
    const survey = buildDesignerSurvey(DESIGNER_SCHEMA);

    // act
    const candidates = getLoopSourceCandidates(loopNamed(survey, "outerLoop"), survey);

    // assert — not innerSource, deepSource or unrelatedInner, which live in templates
    expect(candidates).toEqual([{ value: "topLevel", text: "topLevel" }]);
  });

  it("offers a nested loop its siblings as panel-scoped names, plus page level", () => {
    // arrange
    const survey = buildDesignerSurvey(DESIGNER_SCHEMA);

    // act
    const candidates = getLoopSourceCandidates(loopNamed(survey, "innerLoop"), survey);

    // assert
    expect(candidates).toEqual([
      { value: "panel.innerSource", text: "innerSource" },
      { value: "topLevel", text: "topLevel" },
    ]);
  });

  it("never offers a question from an unrelated panel template", () => {
    // arrange
    const survey = buildDesignerSurvey(DESIGNER_SCHEMA);

    // act
    const everyCandidate = collectLoopTemplates(survey).flatMap((loop) =>
      getLoopSourceCandidates(loop, survey),
    );

    // assert
    expect(everyCandidate.map((c) => c.text)).not.toContain("unrelatedInner");
  });

  it("never offers a loop's own descendants", () => {
    // arrange
    const survey = buildDesignerSurvey(DESIGNER_SCHEMA);

    // act
    const candidates = getLoopSourceCandidates(loopNamed(survey, "innerLoop"), survey);

    // assert — deepSource lives inside innerLoop's own template
    expect(candidates.map((c) => c.text)).not.toContain("deepSource");
  });

  it("excludes non-select questions", () => {
    // arrange
    const survey = buildDesignerSurvey(DESIGNER_SCHEMA);

    // act
    const candidates = getLoopSourceCandidates(loopNamed(survey, "innerLoop"), survey);

    // assert
    expect(candidates.map((c) => c.text)).not.toContain("notASelect");
  });

  it("hides an outer name that a nearer scope shadows", () => {
    // arrange — "shared" exists at page level and as a sibling
    const survey = buildDesignerSurvey({
      pages: [
        {
          elements: [
            { type: "checkbox", name: "shared", choices: ["a"] },
            {
              type: "paneldynamic",
              name: "outerLoop",
              templateElements: [
                { type: "checkbox", name: "shared", choices: ["b"] },
                {
                  type: "paneldynamic",
                  name: "innerLoop",
                  templateElements: [{ type: "text", name: "t" }],
                  loopSource: ["panel.shared"],
                },
              ],
              loopSource: ["shared"],
            },
          ],
        },
      ],
    });

    // act
    const candidates = getLoopSourceCandidates(loopNamed(survey, "innerLoop"), survey);

    // assert — only the addressable one is offered; a bare "shared" could never
    // reach the page-level question from here
    expect(candidates).toEqual([{ value: "panel.shared", text: "shared" }]);
  });

  it("offers nothing for a loop nested beyond the depth cap", () => {
    // arrange
    const survey = buildDesignerSurvey({
      pages: [
        {
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
        },
      ],
    });

    // act / assert — the runtime refuses depth 3, so the designer does too
    expect(getLoopSourceCandidates(loopNamed(survey, "l2"), survey).length).toBeGreaterThan(0);
    expect(getLoopSourceCandidates(loopNamed(survey, "l3"), survey)).toEqual([]);
  });
});

describe("resolveLoopSourceInScope", () => {
  it("resolves both stored forms of a sibling name", () => {
    // arrange
    const survey = buildDesignerSurvey(DESIGNER_SCHEMA);
    const innerLoop = loopNamed(survey, "innerLoop");

    // act / assert
    expect(resolveLoopSourceInScope(innerLoop, survey, "panel.innerSource")?.name).toBe(
      "innerSource",
    );
    expect(resolveLoopSourceInScope(innerLoop, survey, "innerSource")?.name).toBe(
      "innerSource",
    );
  });

  it("does not let a panel-scoped name fall through to page level", () => {
    // arrange — `panel.orphan` names no sibling, but `orphan` exists at page
    // level. Runtime resolves `panel.` against the immediate panel only, so the
    // designer must not resolve it either, or it populates pickers from a
    // question the form can never actually loop over.
    const survey = buildDesignerSurvey({
      pages: [
        {
          elements: [
            { type: "checkbox", name: "outerSrc", choices: ["a"] },
            { type: "checkbox", name: "orphan", choices: ["p", "q"] },
            {
              type: "paneldynamic",
              name: "outerLoop",
              loopSource: ["outerSrc"],
              templateElements: [
                {
                  type: "paneldynamic",
                  name: "innerLoop",
                  loopSource: ["panel.orphan"],
                  templateElements: [{ type: "text", name: "t" }],
                },
              ],
            },
          ],
        },
      ],
    });
    const innerLoop = loopNamed(survey, "innerLoop");

    // act / assert
    expect(resolveLoopSourceInScope(innerLoop, survey, "panel.orphan")).toBeUndefined();
    // the bare form still resolves through the scope chain
    expect(resolveLoopSourceInScope(innerLoop, survey, "orphan")?.name).toBe("orphan");
  });

  it("refuses a name outside the loop's scope", () => {
    // arrange
    const survey = buildDesignerSurvey(DESIGNER_SCHEMA);

    // act / assert — the old flat lookup would have found this
    expect(
      resolveLoopSourceInScope(loopNamed(survey, "outerLoop"), survey, "unrelatedInner"),
    ).toBeUndefined();
  });
});
