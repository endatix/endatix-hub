import { Serializer } from "survey-core";
import { beforeAll, describe, expect, it } from "vitest";
import {
  EDX_HIDE_UNTIL_TYPING_PROPERTY,
  EDX_MIN_SEARCH_LENGTH_PROPERTY,
} from "../constants";
import {
  registerBlindSearchTagboxGlobals,
  resetBlindSearchTagboxRegistryForTests,
} from "../infrastructure/registry";

describe("registerBlindSearchTagboxGlobals", () => {
  beforeAll(() => {
    registerBlindSearchTagboxGlobals();
  });

  it("registers edxHideUntilTyping on tagbox only", () => {
    // Act
    const hideProperty = Serializer.findProperty(
      "tagbox",
      EDX_HIDE_UNTIL_TYPING_PROPERTY,
    );
    const dropdownProperty = Serializer.findProperty(
      "dropdown",
      EDX_HIDE_UNTIL_TYPING_PROPERTY,
    );

    // Assert
    expect(hideProperty).toBeDefined();
    expect(hideProperty?.type).toBe("boolean");
    expect(hideProperty?.category).toBe("choices");
    expect(dropdownProperty).toBeUndefined();
  });

  it("registers edxMinSearchLength with visibleIf on edxHideUntilTyping", () => {
    // Act
    const minLengthProperty = Serializer.findProperty(
      "tagbox",
      EDX_MIN_SEARCH_LENGTH_PROPERTY,
    );

    // Assert
    expect(minLengthProperty).toBeDefined();
    expect(minLengthProperty?.type).toBe("number");
    expect(
      minLengthProperty?.visibleIf?.({ edxHideUntilTyping: true }),
    ).toBe(true);
    expect(
      minLengthProperty?.visibleIf?.({ edxHideUntilTyping: false }),
    ).toBe(false);
  });

  it("is idempotent", () => {
    // Act & Assert
    expect(() => registerBlindSearchTagboxGlobals()).not.toThrow();
  });

  it("resetBlindSearchTagboxRegistryForTests clears serializer metadata", () => {
    // Act
    resetBlindSearchTagboxRegistryForTests();

    // Assert
    expect(
      Serializer.findProperty("tagbox", EDX_HIDE_UNTIL_TYPING_PROPERTY),
    ).toBeUndefined();
    expect(
      Serializer.findProperty("tagbox", EDX_MIN_SEARCH_LENGTH_PROPERTY),
    ).toBeUndefined();

    registerBlindSearchTagboxGlobals();
  });
});
