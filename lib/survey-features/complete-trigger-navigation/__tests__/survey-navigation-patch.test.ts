import { Model, settings } from "survey-core";
import { beforeAll, describe, expect, it } from "vitest";
import { EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY } from "../constants";
import { registerCompleteTriggerNavigationProperty } from "../infrastructure/registry";
import { installCompleteTriggerNavigationPatch } from "../infrastructure/survey-navigation-patch";

const ANSWER_SCREENOUT = {
  pages: [
    { name: "page1", elements: [{ type: "text", name: "q1" }] },
    { name: "page2", elements: [{ type: "text", name: "q2" }] },
  ],
  triggers: [{ type: "complete", expression: "{q1} = 'done'" }],
};

/** A screenout fed by a URL or metadata value, not by a question answer. */
const VARIABLE_SCREENOUT = {
  pages: [
    { name: "page1", elements: [{ type: "text", name: "q1" }] },
    { name: "page2", elements: [{ type: "text", name: "q2" }] },
  ],
  triggers: [{ type: "complete", expression: "{screen} = 'out'" }],
};

const WITHDRAWABLE_SCREENOUT = {
  pages: [
    { name: "page1", elements: [{ type: "text", name: "q1" }] },
    { name: "page2", elements: [{ type: "text", name: "q2" }] },
  ],
  triggers: [
    { type: "complete", expression: "{screen} = 'out' and {q1} empty" },
  ],
};

function turnedOff(json: object): Model {
  return new Model({
    ...json,
    [EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY]: false,
  });
}

function navVisible(model: Model, id: string): boolean {
  const action = model.navigationBar.actions.find((item) => item.id === id);
  return action?.isVisible === true;
}

// survey-core marks this member private. The runner still sets it.
function canBeCompletedByTrigger(model: Model): boolean {
  return (model as unknown as { canBeCompletedByTrigger: boolean })
    .canBeCompletedByTrigger;
}

describe("installCompleteTriggerNavigationPatch", () => {
  beforeAll(() => {
    registerCompleteTriggerNavigationProperty();
    installCompleteTriggerNavigationPatch();
  });

  it("is idempotent", () => {
    // Arrange
    const model = turnedOff(ANSWER_SCREENOUT);

    // Act
    installCompleteTriggerNavigationPatch();
    model.setValue("q1", "done");

    // Assert
    expect(navVisible(model, "sv-nav-next")).toBe(true);
    expect(navVisible(model, "sv-nav-complete")).toBe(false);
  });

  it("switches Next to Complete when omitted or true, with two models alive at once", () => {
    // Arrange
    const executeCompleteOnValueChanged =
      settings.triggers.executeCompleteOnValueChanged;
    const omitted = new Model(ANSWER_SCREENOUT);
    const explicitTrue = new Model({
      ...ANSWER_SCREENOUT,
      [EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY]: true,
    });
    const off = turnedOff(ANSWER_SCREENOUT);

    // Act
    omitted.setValue("q1", "done");
    explicitTrue.setValue("q1", "done");
    off.setValue("q1", "done");

    // Assert
    expect(navVisible(omitted, "sv-nav-next")).toBe(false);
    expect(navVisible(omitted, "sv-nav-complete")).toBe(true);
    expect(navVisible(explicitTrue, "sv-nav-next")).toBe(false);
    expect(navVisible(explicitTrue, "sv-nav-complete")).toBe(true);
    expect(navVisible(off, "sv-nav-next")).toBe(true);
    expect(navVisible(off, "sv-nav-complete")).toBe(false);
    expect(settings.triggers.changeNavigationButtonsOnComplete).toBe(true);
    expect(settings.triggers.executeCompleteOnValueChanged).toBe(
      executeCompleteOnValueChanged,
    );
  });

  it("leaves Next in place for an answer-driven screenout and completes on next", () => {
    // Arrange
    const model = turnedOff(ANSWER_SCREENOUT);

    // Act
    model.setValue("q1", "done");

    // Assert
    expect(navVisible(model, "sv-nav-next")).toBe(true);
    expect(navVisible(model, "sv-nav-complete")).toBe(false);

    // Act
    model.nextPage();

    // Assert
    expect(model.state).toBe("completed");
  });

  it("completes on next for a screenout driven only by a variable", () => {
    // Arrange — checkOnPageTriggers passes only the current page's question
    // values as changed keys, so survey-core alone never runs this trigger.
    const model = turnedOff(VARIABLE_SCREENOUT);

    // Act
    model.setVariable("screen", "out");

    // Assert
    expect(navVisible(model, "sv-nav-next")).toBe(true);
    expect(navVisible(model, "sv-nav-complete")).toBe(false);
    expect(canBeCompletedByTrigger(model)).toBe(true);

    // Act
    model.nextPage();

    // Assert
    expect(model.state).toBe("completed");
    expect(model.currentPage?.name).not.toBe("page2");
  });

  it("keeps the trigger bookkeeping so a withdrawn screenout advances normally", () => {
    // Arrange — the variable is set before anything else touches the model,
    // the order applyVariablesToModel uses for a resumed submission.
    const model = turnedOff(WITHDRAWABLE_SCREENOUT);
    model.setVariable("screen", "out");
    expect(canBeCompletedByTrigger(model)).toBe(true);

    // Act — the condition stops holding
    model.setValue("q1", "x");

    // Assert
    expect(canBeCompletedByTrigger(model)).toBe(false);
    expect(navVisible(model, "sv-nav-next")).toBe(true);
    expect(navVisible(model, "sv-nav-complete")).toBe(false);

    // Act
    model.nextPage();

    // Assert
    expect(model.state).toBe("running");
    expect(model.currentPage?.name).toBe("page2");
  });

  it("still shows Complete on the last page when the option is off", () => {
    // Arrange
    const model = turnedOff(ANSWER_SCREENOUT);

    // Act
    model.currentPageNo = 1;

    // Assert
    expect(navVisible(model, "sv-nav-next")).toBe(false);
    expect(navVisible(model, "sv-nav-complete")).toBe(true);
  });

  it("attributes the completion to the trigger when Next completes", () => {
    // Arrange
    const model = turnedOff(VARIABLE_SCREENOUT);
    let completedByTrigger: boolean | undefined;
    model.onComplete.add((_, options) => {
      completedByTrigger = (
        options as unknown as { isCompleteOnTrigger: boolean }
      ).isCompleteOnTrigger;
    });

    // Act
    model.setVariable("screen", "out");
    model.nextPage();

    // Assert
    expect(model.state).toBe("completed");
    expect(completedByTrigger).toBe(true);
  });
});
