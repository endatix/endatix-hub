import { getLocaleStrings } from "survey-creator-core";
import { beforeAll, describe, expect, it } from "vitest";
import { CARRY_FORWARD_ENABLED_PROPERTY } from "@/lib/survey-features/carry-forward/constants";
import { DISPLAY_MODE_PROPERTY } from "../constants";
import {
  registerMatrixCarouselCreatorHelp,
  resetMatrixCarouselCreatorHelpForTests,
} from "../infrastructure/creator-bindings";

describe("registerMatrixCarouselCreatorHelp", () => {
  beforeAll(() => {
    registerMatrixCarouselCreatorHelp();
  });

  it("registers pehelp text for the carousel-specific properties", () => {
    // Act
    const translations = getLocaleStrings("en");

    // Assert
    expect(translations.pehelp[DISPLAY_MODE_PROPERTY]).toContain("Carousel");
  });

  it("does not set its own pehelp for edxCarryForwardEnabled — that key is shared, global, and owned by carry-forward's own help text", () => {
    // Act
    const translations = getLocaleStrings("en");

    // Assert
    expect(translations.pehelp[CARRY_FORWARD_ENABLED_PROPERTY]).toBeUndefined();
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
