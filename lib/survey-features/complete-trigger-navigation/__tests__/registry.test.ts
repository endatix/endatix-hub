import { Model, Serializer } from "survey-core";
import { PropertyGridModel } from "survey-creator-core";
import { beforeAll, describe, expect, it } from "vitest";
import {
  CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_DISPLAY_NAME,
  CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY,
} from "../constants";
import { registerCompleteTriggerNavigationProperty } from "../infrastructure/registry";

const TWO_PAGE_SURVEY = {
  pages: [
    { name: "page1", elements: [{ type: "text", name: "q1" }] },
    { name: "page2", elements: [{ type: "text", name: "q2" }] },
  ],
};

function navigationQuestionNames(model: Model): string[] {
  const grid = new PropertyGridModel(model);
  const navigationPanel = grid.survey.getPanelByName("navigation");
  return navigationPanel.questions.map((question) => question.name);
}

describe("registerCompleteTriggerNavigationProperty", () => {
  beforeAll(() => {
    registerCompleteTriggerNavigationProperty();
  });

  it("registers a boolean that defaults to true on the navigation category", () => {
    // Act
    const property = Serializer.findProperty(
      "survey",
      CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY,
    );

    // Assert
    expect(property).toBeDefined();
    expect(property?.type).toBe("boolean");
    expect(property?.defaultValue).toBe(true);
    expect(property?.displayName).toBe(
      CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_DISPLAY_NAME,
    );
    expect(property?.category).toBe("navigation");
  });

  it("is idempotent", () => {
    // Act
    registerCompleteTriggerNavigationProperty();
    const property = Serializer.findProperty(
      "survey",
      CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY,
    );

    // Assert
    expect(property?.category).toBe("navigation");
  });

  it("places the property on the navigation tab immediately after showPrevButton", () => {
    // Arrange
    const model = new Model(TWO_PAGE_SURVEY);

    // Act
    const names = navigationQuestionNames(model);
    const previousButtonIndex = names.indexOf("showPrevButton");
    const propertyIndex = names.indexOf(
      CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY,
    );
    const othersPanel = new PropertyGridModel(model).survey.getPanelByName(
      "others",
    );
    const onOthersTab = othersPanel?.questions.some(
      (question) =>
        question.name === CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY,
    );

    // Assert
    expect(previousButtonIndex).toBeGreaterThanOrEqual(0);
    expect(propertyIndex).toBe(previousButtonIndex + 1);
    expect(onOthersTab).toBeFalsy();
  });

  it("keeps false through toJSON and omits the default true", () => {
    // Arrange
    const turnedOff = new Model({
      ...TWO_PAGE_SURVEY,
      [CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY]: false,
    });
    const leftOn = new Model(TWO_PAGE_SURVEY);
    const explicitTrue = new Model({
      ...TWO_PAGE_SURVEY,
      [CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY]: true,
    });

    // Act
    const offJson = turnedOff.toJSON();
    const onJson = leftOn.toJSON();
    const explicitTrueJson = explicitTrue.toJSON();
    const reloaded = new Model(offJson);

    // Assert
    expect(offJson[CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY]).toBe(false);
    expect(onJson[CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY]).toBeUndefined();
    expect(
      explicitTrueJson[CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY],
    ).toBeUndefined();
    expect(
      reloaded.getPropertyValue(CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY),
    ).toBe(false);
  });
});
