import { Model, Serializer } from "survey-core";
import { describe, expect, it } from "vitest";
import { EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY } from "../constants";
// Side-effect import only. No registry import and no lifecycle hook call.
import "../infrastructure/complete-trigger-navigation.extension";

describe("completeTriggerNavigationExtension", () => {
  it("registers the property on import, without onInit", () => {
    // Act
    const property = Serializer.findProperty(
      "survey",
      EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY,
    );

    // Assert
    expect(property).toBeDefined();
  });

  it("keeps a stored false through a save while extensions are off", () => {
    // Arrange — the JSON editor save path: new Model, fromJSON, toJSON.
    const model = new Model();
    model.fromJSON({
      pages: [{ name: "page1", elements: [{ type: "text", name: "q1" }] }],
      [EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY]: false,
    });

    // Act
    const saved = model.toJSON();

    // Assert
    expect(saved[EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY]).toBe(false);
  });

  it("leaves the checkbox hidden until onInit reveals it", () => {
    // Act
    const property = Serializer.findProperty(
      "survey",
      EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY,
    );

    // Assert
    expect(property?.visible).toBe(false);
  });
});
