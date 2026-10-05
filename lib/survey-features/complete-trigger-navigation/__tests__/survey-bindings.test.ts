import { Model, settings } from "survey-core";
import { beforeAll, describe, expect, it } from "vitest";
import { CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY } from "../constants";
import { registerCompleteTriggerNavigationProperty } from "../infrastructure/registry";
import { bindChangeNavigationButtonsOnComplete } from "../infrastructure/survey-bindings";

const COMPLETE_WHEN_DONE = {
  pages: [
    { name: "page1", elements: [{ type: "text", name: "q1" }] },
    { name: "page2", elements: [{ type: "text", name: "q2" }] },
  ],
  triggers: [{ type: "complete", expression: "{q1} = 'done'" }],
};

function navVisible(model: Model, id: string): boolean {
  const action = model.navigationBar.actions.find((item) => item.id === id);
  return action?.isVisible === true;
}

// survey-core marks these members private. The runner still sets them.
function canBeCompletedByTrigger(model: Model): boolean {
  return (model as unknown as { canBeCompletedByTrigger: boolean })
    .canBeCompletedByTrigger;
}

function isCompleted(model: Model): boolean {
  return (model as unknown as { isCompleted: boolean }).isCompleted;
}

describe("bindChangeNavigationButtonsOnComplete", () => {
  beforeAll(() => {
    registerCompleteTriggerNavigationProperty();
  });

  it("switches Next to Complete when the option is omitted or true, including two models at once", () => {
    // Arrange
    const executeCompleteOnValueChanged =
      settings.triggers.executeCompleteOnValueChanged;
    const executeSkipOnValueChanged = settings.triggers.executeSkipOnValueChanged;
    const omitted = new Model(COMPLETE_WHEN_DONE);
    const explicitTrue = new Model({
      ...COMPLETE_WHEN_DONE,
      [CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY]: true,
    });
    bindChangeNavigationButtonsOnComplete(omitted);
    bindChangeNavigationButtonsOnComplete(explicitTrue);

    // Act
    omitted.setValue("q1", "done");
    explicitTrue.setValue("q1", "done");

    // Assert
    expect(navVisible(omitted, "sv-nav-next")).toBe(false);
    expect(navVisible(omitted, "sv-nav-complete")).toBe(true);
    expect(canBeCompletedByTrigger(omitted)).toBe(true);
    expect(navVisible(explicitTrue, "sv-nav-next")).toBe(false);
    expect(navVisible(explicitTrue, "sv-nav-complete")).toBe(true);
    expect(canBeCompletedByTrigger(explicitTrue)).toBe(true);
    expect(settings.triggers.changeNavigationButtonsOnComplete).toBe(true);
    expect(settings.triggers.executeCompleteOnValueChanged).toBe(
      executeCompleteOnValueChanged,
    );
    expect(settings.triggers.executeSkipOnValueChanged).toBe(
      executeSkipOnValueChanged,
    );
  });

  it("leaves Next in place when the option is off and still completes on next", () => {
    // Arrange
    const model = new Model({
      ...COMPLETE_WHEN_DONE,
      [CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY]: false,
    });
    const stillOn = new Model(COMPLETE_WHEN_DONE);
    bindChangeNavigationButtonsOnComplete(model);
    bindChangeNavigationButtonsOnComplete(stillOn);

    // Act
    model.setValue("q1", "done");
    stillOn.setValue("q1", "done");

    // Assert
    expect(navVisible(model, "sv-nav-next")).toBe(true);
    expect(navVisible(model, "sv-nav-complete")).toBe(false);
    expect(canBeCompletedByTrigger(model)).toBe(false);
    expect(navVisible(stillOn, "sv-nav-next")).toBe(false);
    expect(navVisible(stillOn, "sv-nav-complete")).toBe(true);
    expect(settings.triggers.changeNavigationButtonsOnComplete).toBe(true);

    // Act
    model.nextPage();

    // Assert
    expect(model.state).toBe("completed");
    expect(isCompleted(model)).toBe(true);
  });

  it("restores the prototype method when a second bind is disposed", () => {
    // Arrange
    const model = new Model({
      ...COMPLETE_WHEN_DONE,
      [CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY]: false,
    });
    bindChangeNavigationButtonsOnComplete(model);

    // Act
    const disposeSecondBind = bindChangeNavigationButtonsOnComplete(model);
    disposeSecondBind();

    // Assert
    expect(model.canBeCompleted).toBe(Model.prototype.canBeCompleted);
    expect(settings.triggers.changeNavigationButtonsOnComplete).toBe(true);
  });
});
