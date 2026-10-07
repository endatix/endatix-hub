import { Model, type CompleteEvent } from "survey-core";
import { describe, expect, it } from "vitest";
import { createScreenOutDecision } from "../completion-outcome";
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

/** What survey-core's "Try again" action runs (private in its typings). */
function tryAgain(survey: Model): void {
  (survey as unknown as { saveDataOnComplete(): void }).saveDataOnComplete();
}

describe("createScreenOutDecision", () => {
  it("screens out when the screen-out trigger ends the survey", () => {
    // Arrange
    const decide = createScreenOutDecision();
    const survey = new Model(AGE_GATE);
    const completions = captureCompletions(survey);
    survey.setValue("age", 16);

    // Act
    survey.nextPage();

    // Assert
    expect(decide(survey, completions[0])).toBe(true);
  });

  it("keeps the screen-out on Try again, which omits the trigger", () => {
    // Arrange
    const decide = createScreenOutDecision();
    const survey = new Model(AGE_GATE);
    const completions = captureCompletions(survey);
    survey.setValue("age", 16);
    survey.nextPage();
    decide(survey, completions[0]);

    // Act
    tryAgain(survey);

    // Assert
    expect(completions[1].completeTrigger).toBeUndefined();
    expect(decide(survey, completions[1])).toBe(true);
  });

  it("screens out when a Complete trigger was recorded first", () => {
    // Arrange
    const decide = createScreenOutDecision();
    const survey = new Model({
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
    expect(decide(survey, completions[0])).toBe(true);
  });

  it("completes normally when no screen-out condition holds", () => {
    // Arrange
    const decide = createScreenOutDecision();
    const survey = new Model(AGE_GATE);
    const completions = captureCompletions(survey);
    survey.setValue("age", 30);
    survey.nextPage();

    // Act
    survey.completeLastPage();

    // Assert
    expect(decide(survey, completions[0])).toBe(false);
  });

  it("completes normally when a negated condition holds on a hidden, unanswered question", () => {
    // Arrange
    const decide = createScreenOutDecision();
    const survey = new Model({
      pages: [
        {
          name: "only",
          elements: [
            { type: "text", name: "country" },
            { type: "text", name: "employed", visibleIf: "{country} = 'US'" },
          ],
        },
      ],
      triggers: [{ type: "screenout", expression: "{employed} != 'yes'" }],
    });
    const completions = captureCompletions(survey);
    survey.setValue("country", "DE");

    // Act
    survey.completeLastPage();

    // Assert
    expect(survey.runCondition("{employed} != 'yes'")).toBe(true);
    expect(decide(survey, completions[0])).toBe(false);
  });

  it("keeps a normal completion on Try again", () => {
    // Arrange
    const decide = createScreenOutDecision();
    const survey = new Model(AGE_GATE);
    const completions = captureCompletions(survey);
    survey.setValue("age", 30);
    survey.nextPage();
    survey.completeLastPage();
    decide(survey, completions[0]);
    survey.setValue("age", 16);

    // Act
    tryAgain(survey);

    // Assert
    expect(decide(survey, completions[1])).toBe(false);
  });
});
