import { getLocaleStrings } from "survey-creator-core";
import { beforeEach, describe, expect, it } from "vitest";
import { DATA_LIST_PROPERTY_NAME } from "../../constants";
import {
  registerDataListCreatorHelp,
  resetDataListCreatorHelpForTests,
} from "../creator-help";

describe("registerDataListCreatorHelp", () => {
  beforeEach(() => {
    resetDataListCreatorHelpForTests();
  });

  it("registers pehelp text for the data list property", () => {
    registerDataListCreatorHelp();

    const translations = getLocaleStrings("en");
    const helpText = translations.pehelp[DATA_LIST_PROPERTY_NAME];

    expect(helpText).toContain("shared data list");
    expect(helpText).toContain("define items once");
    expect(helpText).toContain("search and lazy loading");
    expect(helpText).toContain('href="/data-lists"');
    expect(helpText).toContain('target="_blank"');
  });

  it("clears pehelp text on reset instead of leaving it from a prior register", () => {
    registerDataListCreatorHelp();
    resetDataListCreatorHelpForTests();

    const translations = getLocaleStrings("en");

    expect(translations.pehelp[DATA_LIST_PROPERTY_NAME]).toBeUndefined();
  });
});
