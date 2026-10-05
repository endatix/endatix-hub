import { Serializer } from "survey-core";
import { describe, expect, it } from "vitest";
import { CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY } from "../constants";
// Side-effect import only. No registry import and no onInit call.
import "../infrastructure/complete-trigger-navigation.extension";

describe("completeTriggerNavigationExtension", () => {
  it("registers the property on import, without onInit", () => {
    // Act
    const property = Serializer.findProperty(
      "survey",
      CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY,
    );

    // Assert
    expect(property).toBeDefined();
  });
});
