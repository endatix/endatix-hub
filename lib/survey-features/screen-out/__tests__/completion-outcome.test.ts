import { Model, type CompleteEvent } from "survey-core";
import { describe, expect, it } from "vitest";
import { isScreenedOutOnComplete } from "../completion-outcome";
import { registerScreenOutTrigger } from "../infrastructure/registry";

registerScreenOutTrigger();

const AGE_GATE = {
  pages: [
    { name: "agePage", elements: [{ type: "text", name: "age" }] },
    { name: "next", elements: [{ type: "text", name: "q" }] },
  ],
  triggers: [{ type: "screenout", expression: "{age} < 18" }],
};

function captureCompletions(survey: Model): CompleteEvent[] {
  const events: CompleteEvent[] = [];
  survey.onComplete.add((_sender, event) => {
    events.push(event);
  });
  return events;
}

describe("isScreenedOutOnComplete", () => {
  it("screens out when the screen-out trigger ends the survey", () => {
    // Arrange
    const survey = new Model(AGE_GATE);
    const completions = captureCompletions(survey);
    survey.setValue("age", 16);

    // Act
    survey.nextPage();

    // Assert
    expect(
      isScreenedOutOnComplete(survey, completions[0].completeTrigger),
    ).toBe(true);
  });

  it("still screens out on Try again, which omits the trigger", () => {
    // Arrange
    const survey = new Model(AGE_GATE);
    const completions = captureCompletions(survey);
    survey.setValue("age", 16);
    survey.nextPage();

    // Act: what survey-core's "Try again" action runs (private in its typings)
    (survey as unknown as { saveDataOnComplete(): void }).saveDataOnComplete();

    // Assert
    expect(completions[1].completeTrigger).toBeUndefined();
    expect(
      isScreenedOutOnComplete(survey, completions[1].completeTrigger),
    ).toBe(true);
  });

  it("screens out when a Complete trigger was recorded first", () => {
    // Arrange
    const survey = new Model({
      ...AGE_GATE,
      pages: [
        {
          name: "only",
          elements: [
            { type: "text", name: "q" },
            { type: "text", name: "age" },
          ],
        },
      ],
      triggers: [
        { type: "complete", expression: "{q} = 'done'" },
        { type: "screenout", expression: "{age} < 18" },
      ],
    });
    const completions = captureCompletions(survey);
    survey.setValue("q", "done");
    survey.setValue("age", 16);

    // Act
    survey.completeLastPage();

    // Assert
    expect(completions[0].completeTrigger?.getType()).toBe("completetrigger");
    expect(
      isScreenedOutOnComplete(survey, completions[0].completeTrigger),
    ).toBe(true);
  });

  it("completes normally when no screen-out condition holds", () => {
    // Arrange
    const survey = new Model(AGE_GATE);
    const completions = captureCompletions(survey);
    survey.setValue("age", 30);
    survey.nextPage();

    // Act
    survey.completeLastPage();

    // Assert
    expect(
      isScreenedOutOnComplete(survey, completions[0].completeTrigger),
    ).toBe(false);
  });
});
