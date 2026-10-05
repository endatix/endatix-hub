import { Model, Serializer } from "survey-core";
import { PropertyGridModel } from "survey-creator-core";
import { beforeAll, describe, expect, it } from "vitest";
import {
  EDX_CHANGE_NAVIGATION_ON_COMPLETE_DISPLAY_NAME,
  EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY,
} from "../constants";
import {
  registerCompleteTriggerNavigationProperty,
  revealCompleteTriggerNavigationProperty,
} from "../infrastructure/registry";

const TWO_PAGE_SURVEY = {
  pages: [
    { name: "page1", elements: [{ type: "text", name: "q1" }] },
    { name: "page2", elements: [{ type: "text", name: "q2" }] },
  ],
};

function panelQuestionNames(model: Model, panel: string): string[] {
  const grid = new PropertyGridModel(model);
  const found = grid.survey.getPanelByName(panel);
  return found ? found.questions.map((question) => question.name) : [];
}

describe("registerCompleteTriggerNavigationProperty", () => {
  beforeAll(() => {
    registerCompleteTriggerNavigationProperty();
  });

  it("registers a boolean that defaults to true on the navigation category", () => {
    // Act
    const property = Serializer.findProperty(
      "survey",
      EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY,
    );

    // Assert
    expect(property).toBeDefined();
    expect(property?.type).toBe("boolean");
    expect(property?.defaultValue).toBe(true);
    expect(property?.displayName).toBe(
      EDX_CHANGE_NAVIGATION_ON_COMPLETE_DISPLAY_NAME,
    );
    expect(property?.category).toBe("navigation");
  });

  it("is idempotent", () => {
    // Act
    registerCompleteTriggerNavigationProperty();
    const property = Serializer.findProperty(
      "survey",
      EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY,
    );

    // Assert
    expect(property?.category).toBe("navigation");
  });

  it("stays off the property grid until it is revealed, and still serializes", () => {
    // Arrange
    const model = new Model(TWO_PAGE_SURVEY);
    const stored = new Model({
      ...TWO_PAGE_SURVEY,
      [EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY]: false,
    });

    // Act
    const navigationNames = panelQuestionNames(model, "navigation");
    const storedJson = stored.toJSON();

    // Assert
    expect(
      navigationNames.includes(EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY),
    ).toBe(false);
    expect(storedJson[EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY]).toBe(false);
  });

  it("places the property on the navigation tab immediately after showPrevButton once revealed", () => {
    // Arrange
    revealCompleteTriggerNavigationProperty();
    const model = new Model(TWO_PAGE_SURVEY);

    // Act
    const names = panelQuestionNames(model, "navigation");
    const previousButtonIndex = names.indexOf("showPrevButton");
    const propertyIndex = names.indexOf(
      EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY,
    );
    const onOthersTab = panelQuestionNames(model, "others").includes(
      EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY,
    );

    // Assert
    expect(previousButtonIndex).toBeGreaterThanOrEqual(0);
    expect(propertyIndex).toBe(previousButtonIndex + 1);
    expect(onOthersTab).toBe(false);
  });

  it("keeps false through toJSON and omits the default true", () => {
    // Arrange
    const turnedOff = new Model({
      ...TWO_PAGE_SURVEY,
      [EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY]: false,
    });
    const leftOn = new Model(TWO_PAGE_SURVEY);
    const explicitTrue = new Model({
      ...TWO_PAGE_SURVEY,
      [EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY]: true,
    });

    // Act
    const offJson = turnedOff.toJSON();
    const onJson = leftOn.toJSON();
    const explicitTrueJson = explicitTrue.toJSON();
    const reloaded = new Model(offJson);

    // Assert
    expect(offJson[EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY]).toBe(false);
    expect(
      onJson[EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY],
    ).toBeUndefined();
    expect(
      explicitTrueJson[EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY],
    ).toBeUndefined();
    expect(
      reloaded.getPropertyValue(EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY),
    ).toBe(false);
  });
});
