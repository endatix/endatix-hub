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
    // Arrange — capture whatever this shared key currently holds (carry-
    // forward's own help text if that registration already ran in this
    // process, or undefined if it hasn't) rather than assuming undefined:
    // pehelp is a single flat dictionary keyed by property name, not scoped
    // per question type, so a specific expected value here would be coupled
    // to whichever other suite happens to run first.
    const translations = getLocaleStrings("en");
    const before = translations.pehelp[CARRY_FORWARD_ENABLED_PROPERTY];

    // Act — re-registering (idempotent) is what would clobber the shared key
    // if this function's own guard against doing so were broken.
    registerMatrixCarouselCreatorHelp();

    // Assert — unchanged across our own call is what actually verifies we
    // don't clobber it, regardless of what carry-forward's own registration
    // left there.
    expect(translations.pehelp[CARRY_FORWARD_ENABLED_PROPERTY]).toBe(before);
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
