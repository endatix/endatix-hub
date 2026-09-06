import { beforeAll, describe, expect, it } from "vitest";
import { PanelModel, Question, SurveyModel } from "survey-core";
import { registerQuestionLoopsGlobals } from "../infrastructure/registry";
import { bindFeatureToSurvey } from "../infrastructure/survey-bindings";

type LoopLike = Question & { panels: PanelModel[]; value: unknown };

/** Outer loop over `outerSource`; inner loop over a sibling, with an exit rule. */
const NESTED_EXIT_SCHEMA = {
  pages: [
    {
      elements: [
        { type: "checkbox", name: "outerSource", choices: ["a", "b"] },
        {
          type: "paneldynamic",
          name: "outerLoop",
          templateElements: [
            { type: "checkbox", name: "innerSource", choices: ["x", "y"] },
            {
              type: "paneldynamic",
              name: "innerLoop",
              templateElements: [
                { type: "rating", name: "innerRating" },
                { type: "text", name: "innerFollowUp" },
              ],
              loopSource: ["panel.innerSource"],
              exitLoopCondition: "{panel.innerRating} = 1",
            },
          ],
          loopSource: ["outerSource"],
        },
      ],
    },
  ],
};

function buildBoundSurvey(schema: object): SurveyModel {
  const survey = new SurveyModel(schema as never);
  bindFeatureToSurvey(survey);
  return survey;
}

function innerLoopIn(outerLoop: LoopLike, outerIndex: number): LoopLike {
  return outerLoop.panels[outerIndex].getQuestionByName("innerLoop") as LoopLike;
}

beforeAll(() => {
  registerQuestionLoopsGlobals();
});

describe("exit conditions on a nested loop", () => {
  it("hides later questions in the inner panel that triggered the exit", () => {
    // arrange
    const survey = buildBoundSurvey(NESTED_EXIT_SCHEMA);
    survey.getQuestionByName("outerSource")!.value = ["a"];
    const outerLoop = survey.getQuestionByName("outerLoop") as LoopLike;
    outerLoop.panels[0].getQuestionByName("innerSource").value = ["x", "y"];
    const innerLoop = innerLoopIn(outerLoop, 0);
    expect(innerLoop.panels).toHaveLength(2);

    // act
    innerLoop.panels[0].getQuestionByName("innerRating").value = 1;

    // assert — the question after the trigger is hidden in that panel only
    expect(innerLoop.panels[0].getQuestionByName("innerFollowUp").isVisible).toBe(
      false,
    );
    expect(innerLoop.panels[1].getQuestionByName("innerFollowUp").isVisible).toBe(
      true,
    );
  });

  it("leaves sibling outer panels untouched", () => {
    // arrange
    const survey = buildBoundSurvey(NESTED_EXIT_SCHEMA);
    survey.getQuestionByName("outerSource")!.value = ["a", "b"];
    const outerLoop = survey.getQuestionByName("outerLoop") as LoopLike;
    outerLoop.panels[0].getQuestionByName("innerSource").value = ["x"];
    outerLoop.panels[1].getQuestionByName("innerSource").value = ["x"];

    // act — trigger the exit inside the FIRST outer panel only
    innerLoopIn(outerLoop, 0).panels[0].getQuestionByName("innerRating").value = 1;

    // assert — exit state is per instance, not shared through the declaration
    expect(
      innerLoopIn(outerLoop, 0).panels[0].getQuestionByName("innerFollowUp")
        .isVisible,
    ).toBe(false);
    expect(
      innerLoopIn(outerLoop, 1).panels[0].getQuestionByName("innerFollowUp")
        .isVisible,
    ).toBe(true);
  });

  it("restores visibility when the triggering answer is changed back", () => {
    // arrange
    const survey = buildBoundSurvey(NESTED_EXIT_SCHEMA);
    survey.getQuestionByName("outerSource")!.value = ["a"];
    const outerLoop = survey.getQuestionByName("outerLoop") as LoopLike;
    outerLoop.panels[0].getQuestionByName("innerSource").value = ["x"];
    const innerPanel = innerLoopIn(outerLoop, 0).panels[0];
    innerPanel.getQuestionByName("innerRating").value = 1;
    expect(innerPanel.getQuestionByName("innerFollowUp").isVisible).toBe(false);

    // act
    innerPanel.getQuestionByName("innerRating").value = 4;

    // assert
    expect(innerPanel.getQuestionByName("innerFollowUp").isVisible).toBe(true);
  });
});

describe("exit conditions on the outer loop with nesting present", () => {
  it("still hides later outer panels when exit-all triggers", () => {
    // arrange
    const survey = buildBoundSurvey({
      pages: [
        {
          elements: [
            { type: "checkbox", name: "outerSource", choices: ["a", "b", "c"] },
            {
              type: "paneldynamic",
              name: "outerLoop",
              templateElements: [
                { type: "rating", name: "outerRating" },
                { type: "checkbox", name: "innerSource", choices: ["x", "y"] },
                {
                  type: "paneldynamic",
                  name: "innerLoop",
                  templateElements: [{ type: "text", name: "t" }],
                  loopSource: ["panel.innerSource"],
                },
              ],
              loopSource: ["outerSource"],
              exitAllLoopsCondition: "{panel.outerRating} <= 2",
            },
          ],
        },
      ],
    });
    survey.getQuestionByName("outerSource")!.value = ["a", "b", "c"];
    const outerLoop = survey.getQuestionByName("outerLoop") as LoopLike;
    expect(outerLoop.panels).toHaveLength(3);

    // act — exit-all from the first outer panel
    outerLoop.panels[0].getQuestionByName("outerRating").value = 1;

    // assert — panels after the trigger are hidden, the trigger's own is not
    expect(outerLoop.panels[0].isVisible).toBe(true);
    expect(outerLoop.panels[1].isVisible).toBe(false);
    expect(outerLoop.panels[2].isVisible).toBe(false);
  });
});

describe("exit state hydration for nested loops", () => {
  it("recomputes nested exit state from data at bind time", () => {
    // arrange — a resumed submission where the inner exit already triggered
    const survey = new SurveyModel(NESTED_EXIT_SCHEMA as never);
    survey.data = {
      outerSource: ["a"],
      outerLoop: [
        {
          itemText: "a",
          itemValue: "a",
          loopIndex: 0,
          innerSource: ["x", "y"],
          innerLoop: [
            { itemText: "x", itemValue: "x", loopIndex: 0, innerRating: 1 },
            { itemText: "y", itemValue: "y", loopIndex: 1 },
          ],
        },
      ],
    };

    // act
    bindFeatureToSurvey(survey);

    // assert
    const outerLoop = survey.getQuestionByName("outerLoop") as LoopLike;
    const innerLoop = innerLoopIn(outerLoop, 0);
    expect(innerLoop.panels).toHaveLength(2);
    expect(innerLoop.panels[0].getQuestionByName("innerFollowUp").isVisible).toBe(
      false,
    );
    expect(innerLoop.panels[1].getQuestionByName("innerFollowUp").isVisible).toBe(
      true,
    );
  });
});
