import { beforeAll, describe, expect, it } from "vitest";
import { PanelModel, Question, SurveyModel } from "survey-core";
import { registerQuestionLoopsGlobals } from "../infrastructure/registry";
import { bindFeatureToSurvey } from "../infrastructure/survey-bindings";
import {
  innerLoopFromTopLevelSchema,
  loopInPlainPanelSchema,
  nestedLoopSurveySchema,
  NESTED_INNER_LOOP_NAME,
  NESTED_INNER_SOURCE_NAME,
  NESTED_OUTER_LOOP_NAME,
  NESTED_OUTER_SOURCE_NAME,
  panelScopedNestedSchema,
} from "./fixtures/nested-loop-survey";

/**
 * End-to-end nesting behaviour (h938), driven only through public API — never
 * by assigning a loop's `value` directly, which is what the sync does.
 */

type LoopLike = Question & { panels: PanelModel[]; value: unknown };

beforeAll(() => {
  registerQuestionLoopsGlobals();
});

function panelCountOf(panel: PanelModel, loopName: string): number {
  return (panel.getQuestionByName(loopName) as LoopLike | undefined)?.panels.length ?? 0;
}

describe("nested loops — the reported JSON", () => {
  it("expands the child loop from a source answered inside the parent panel", () => {
    // arrange
    const survey = new SurveyModel(nestedLoopSurveySchema as never);
    bindFeatureToSurvey(survey);

    // act
    survey.getQuestionByName(NESTED_OUTER_SOURCE_NAME)!.value = ["item1", "item2"];
    const outerLoop = survey.getQuestionByName(NESTED_OUTER_LOOP_NAME) as LoopLike;
    outerLoop.panels[0].getQuestionByName(NESTED_INNER_SOURCE_NAME).value = [
      "item1",
      "item3",
    ];

    // assert
    expect(outerLoop.panels).toHaveLength(2);
    expect(panelCountOf(outerLoop.panels[0], NESTED_INNER_LOOP_NAME)).toBe(2);
  });

  it("keeps sibling outer panels independent", () => {
    // arrange
    const survey = new SurveyModel(nestedLoopSurveySchema as never);
    bindFeatureToSurvey(survey);
    survey.getQuestionByName(NESTED_OUTER_SOURCE_NAME)!.value = ["item1", "item2"];
    const outerLoop = survey.getQuestionByName(NESTED_OUTER_LOOP_NAME) as LoopLike;

    // act — a different selection in each outer panel
    outerLoop.panels[0].getQuestionByName(NESTED_INNER_SOURCE_NAME).value = [
      "item1",
      "item3",
    ];
    outerLoop.panels[1].getQuestionByName(NESTED_INNER_SOURCE_NAME).value = ["item2"];

    // assert — each inner loop follows its own panel's source
    expect(panelCountOf(outerLoop.panels[0], NESTED_INNER_LOOP_NAME)).toBe(2);
    expect(panelCountOf(outerLoop.panels[1], NESTED_INNER_LOOP_NAME)).toBe(1);
  });

  it("nests answers under the owning panel in survey data", () => {
    // arrange
    const survey = new SurveyModel(nestedLoopSurveySchema as never);
    bindFeatureToSurvey(survey);
    survey.getQuestionByName(NESTED_OUTER_SOURCE_NAME)!.value = ["item1"];
    const outerLoop = survey.getQuestionByName(NESTED_OUTER_LOOP_NAME) as LoopLike;
    outerLoop.panels[0].getQuestionByName(NESTED_INNER_SOURCE_NAME).value = ["item2"];

    // act
    const innerLoop = outerLoop.panels[0].getQuestionByName(
      NESTED_INNER_LOOP_NAME,
    ) as LoopLike;
    innerLoop.panels[0].getQuestionByName("question3").value = 4;

    // assert
    const data = survey.data as Record<string, Array<Record<string, unknown>>>;
    const innerData = data[NESTED_OUTER_LOOP_NAME][0][NESTED_INNER_LOOP_NAME] as Array<
      Record<string, unknown>
    >;
    expect(innerData).toHaveLength(1);
    expect(innerData[0].itemValue).toBe("item2");
    expect(innerData[0].question3).toBe(4);
  });
});

describe("nested loops — source shapes", () => {
  it("expands a child loop declared with the canonical panel. prefix", () => {
    // arrange
    const survey = new SurveyModel(panelScopedNestedSchema as never);
    bindFeatureToSurvey(survey);

    // act
    survey.getQuestionByName("outerSource")!.value = ["a", "b"];
    const outerLoop = survey.getQuestionByName("outerLoop") as LoopLike;
    outerLoop.panels[0].getQuestionByName("innerSource").value = ["x", "y", "z"];

    // assert
    expect(panelCountOf(outerLoop.panels[0], "innerLoop")).toBe(3);
    expect(panelCountOf(outerLoop.panels[1], "innerLoop")).toBe(0);
  });

  it("expands a child loop driven by a page-level question", () => {
    // arrange — the second reported variant: no nesting on the source side
    const survey = new SurveyModel(innerLoopFromTopLevelSchema as never);
    bindFeatureToSurvey(survey);

    // act
    survey.getQuestionByName("topLevelSource")!.value = ["x", "y"];
    survey.getQuestionByName("outerSource")!.value = ["a", "b"];

    // assert — every outer panel's inner loop follows the shared source
    const outerLoop = survey.getQuestionByName("outerLoop") as LoopLike;
    expect(panelCountOf(outerLoop.panels[0], "innerLoop")).toBe(2);
    expect(panelCountOf(outerLoop.panels[1], "innerLoop")).toBe(2);
  });

  it("re-syncs inner loops when the page-level source changes afterwards", () => {
    // arrange
    const survey = new SurveyModel(innerLoopFromTopLevelSchema as never);
    bindFeatureToSurvey(survey);
    survey.getQuestionByName("topLevelSource")!.value = ["x"];
    survey.getQuestionByName("outerSource")!.value = ["a"];
    const outerLoop = survey.getQuestionByName("outerLoop") as LoopLike;

    // act
    survey.getQuestionByName("topLevelSource")!.value = ["x", "y", "z"];

    // assert
    expect(panelCountOf(outerLoop.panels[0], "innerLoop")).toBe(3);
  });

  it("expands a loop inside a plain dynamic panel", () => {
    // arrange — the container carries no loopSource at all
    const survey = new SurveyModel(loopInPlainPanelSchema as never);
    bindFeatureToSurvey(survey);
    const plainPanel = survey.getQuestionByName("plainPanel") as LoopLike;

    // act
    plainPanel.panels[0].getQuestionByName("src").value = ["x", "z"];

    // assert
    expect(panelCountOf(plainPanel.panels[0], "loopInPlain")).toBe(2);
    expect(panelCountOf(plainPanel.panels[1], "loopInPlain")).toBe(0);
  });
});

describe("nested loops — outer source changes", () => {
  it("cascades into a newly added outer panel", () => {
    // arrange
    const survey = new SurveyModel(innerLoopFromTopLevelSchema as never);
    bindFeatureToSurvey(survey);
    survey.getQuestionByName("topLevelSource")!.value = ["x", "y"];
    survey.getQuestionByName("outerSource")!.value = ["a"];
    const outerLoop = survey.getQuestionByName("outerLoop") as LoopLike;
    expect(outerLoop.panels).toHaveLength(1);

    // act — growing the outer source creates a panel whose inner loop is new
    survey.getQuestionByName("outerSource")!.value = ["a", "b"];

    // assert
    expect(outerLoop.panels).toHaveLength(2);
    expect(panelCountOf(outerLoop.panels[1], "innerLoop")).toBe(2);
  });

  it("removes outer panels when the outer source shrinks", () => {
    // arrange
    const survey = new SurveyModel(nestedLoopSurveySchema as never);
    bindFeatureToSurvey(survey);
    survey.getQuestionByName(NESTED_OUTER_SOURCE_NAME)!.value = [
      "item1",
      "item2",
      "item3",
    ];
    const outerLoop = survey.getQuestionByName(NESTED_OUTER_LOOP_NAME) as LoopLike;
    expect(outerLoop.panels).toHaveLength(3);

    // act
    survey.getQuestionByName(NESTED_OUTER_SOURCE_NAME)!.value = ["item2"];

    // assert
    expect(outerLoop.panels).toHaveLength(1);
    expect(
      (survey.data as Record<string, Array<Record<string, unknown>>>)[
        NESTED_OUTER_LOOP_NAME
      ][0].itemValue,
    ).toBe("item2");
  });
});

describe("nested loops — hydration from existing data", () => {
  it("rebuilds nested panels from data present at bind time", () => {
    // arrange — a resumed submission, before any binding happens
    const survey = new SurveyModel(nestedLoopSurveySchema as never);
    survey.data = {
      [NESTED_OUTER_SOURCE_NAME]: ["item1", "item2"],
      [NESTED_OUTER_LOOP_NAME]: [
        {
          itemText: "outside_Item 1",
          itemValue: "item1",
          loopIndex: 0,
          [NESTED_INNER_SOURCE_NAME]: ["item1", "item3"],
        },
        {
          itemText: "outside_Item 2",
          itemValue: "item2",
          loopIndex: 1,
          [NESTED_INNER_SOURCE_NAME]: ["item2"],
        },
      ],
    };

    // act
    bindFeatureToSurvey(survey);

    // assert
    const outerLoop = survey.getQuestionByName(NESTED_OUTER_LOOP_NAME) as LoopLike;
    expect(outerLoop.panels).toHaveLength(2);
    expect(panelCountOf(outerLoop.panels[0], NESTED_INNER_LOOP_NAME)).toBe(2);
    expect(panelCountOf(outerLoop.panels[1], NESTED_INNER_LOOP_NAME)).toBe(1);
  });

  it("preserves nested answers across a rebind", () => {
    // arrange
    const survey = new SurveyModel(nestedLoopSurveySchema as never);
    survey.data = {
      [NESTED_OUTER_SOURCE_NAME]: ["item1"],
      [NESTED_OUTER_LOOP_NAME]: [
        {
          itemText: "outside_Item 1",
          itemValue: "item1",
          loopIndex: 0,
          [NESTED_INNER_SOURCE_NAME]: ["item2"],
          [NESTED_INNER_LOOP_NAME]: [
            { itemText: "inside_Item 2", itemValue: "item2", loopIndex: 0, question3: 5 },
          ],
        },
      ],
    };

    // act
    bindFeatureToSurvey(survey);

    // assert
    const outerLoop = survey.getQuestionByName(NESTED_OUTER_LOOP_NAME) as LoopLike;
    const innerLoop = outerLoop.panels[0].getQuestionByName(
      NESTED_INNER_LOOP_NAME,
    ) as LoopLike;
    expect(innerLoop.panels).toHaveLength(1);
    expect(innerLoop.panels[0].getQuestionByName("question3").value).toBe(5);
  });
});

describe("nested loops — hydration of a loop inside a plain panel", () => {
  it("rebuilds inner panels from a stored source on resume", () => {
    // arrange — a saved submission where the source was answered but the inner
    // loop's own panels were never stored. Nothing cascades from a plain panel,
    // so this only works if such a loop is treated as a cascade root.
    const survey = new SurveyModel(loopInPlainPanelSchema as never);
    survey.data = {
      plainPanel: [{ src: ["x", "z"] }, { src: [] }],
    };

    // act
    bindFeatureToSurvey(survey);

    // assert
    const plainPanel = survey.getQuestionByName("plainPanel") as LoopLike;
    expect(panelCountOf(plainPanel.panels[0], "loopInPlain")).toBe(2);
    expect(panelCountOf(plainPanel.panels[1], "loopInPlain")).toBe(0);
  });
});

describe("nested loops — depth cap", () => {
  it("does not sync a loop nested deeper than the limit", () => {
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
    bindFeatureToSurvey(survey);

    // act
    survey.getQuestionByName("s1")!.value = ["a"];
    const l1 = survey.getQuestionByName("l1") as LoopLike;
    l1.panels[0].getQuestionByName("s2").value = ["b"];
    const l2 = l1.panels[0].getQuestionByName("l2") as LoopLike;
    l2.panels[0].getQuestionByName("s3").value = ["c"];

    // assert — depth 2 works, depth 3 is refused rather than silently half-working
    expect(l1.panels).toHaveLength(1);
    expect(l2.panels).toHaveLength(1);
    expect(panelCountOf(l2.panels[0], "l3")).toBe(0);
  });
});
