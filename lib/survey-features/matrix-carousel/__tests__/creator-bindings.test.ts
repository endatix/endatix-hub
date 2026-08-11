import { getLocaleStrings } from "survey-creator-core";
import { beforeAll, describe, expect, it } from "vitest";
import { DISPLAY_MODE_PROPERTY, EDX_ROWS_SOURCE_ENABLED_PROPERTY } from "../constants";
import {
  registerMatrixCarouselCreatorHelp,
  resetMatrixCarouselCreatorHelpForTests,
} from "../infrastructure/creator-bindings";

describe("registerMatrixCarouselCreatorHelp", () => {
  beforeAll(() => {
    registerMatrixCarouselCreatorHelp();
  });

  it("registers pehelp text for the carousel and row-source properties", () => {
    // Act
    const translations = getLocaleStrings("en");

    // Assert
    expect(translations.pehelp[DISPLAY_MODE_PROPERTY]).toContain("Carousel");
    expect(translations.pehelp[EDX_ROWS_SOURCE_ENABLED_PROPERTY]).toContain("overwrites");
  });

  it("is idempotent", () => {
    // Act & Assert
    expect(() => registerMatrixCarouselCreatorHelp()).not.toThrow();
  });

  it("resetMatrixCarouselCreatorHelpForTests clears the registered help text", () => {
    // Act
    resetMatrixCarouselCreatorHelpForTests();
    const translations = getLocaleStrings("en");

    // Assert
    expect(translations.pehelp[DISPLAY_MODE_PROPERTY]).toBeUndefined();

    registerMatrixCarouselCreatorHelp();
  });
});
