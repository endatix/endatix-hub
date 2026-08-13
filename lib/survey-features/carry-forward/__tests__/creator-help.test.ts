import { getLocaleStrings } from "survey-creator-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CARRY_FORWARD_ENABLED_PROPERTY,
  CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  CARRY_FORWARD_MODE_PROPERTY,
  CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  CARRY_FORWARD_SOURCES_PROPERTY,
} from "../constants";

const withBasePathMock = vi.hoisted(() =>
  vi.fn((path: string) => path),
);

vi.mock("@/lib/hosting", () => ({
  withBasePath: withBasePathMock,
}));

import {
  registerAdvancedCarryForwardCreatorHelp,
  resetAdvancedCarryForwardCreatorHelpForTests,
} from "../infrastructure/creator-help";

describe("registerAdvancedCarryForwardCreatorHelp", () => {
  beforeEach(() => {
    resetAdvancedCarryForwardCreatorHelpForTests();
    withBasePathMock.mockReset();
    withBasePathMock.mockImplementation((path: string) => path);
  });

  it("registers pehelp text for priority items and max choices", () => {
    registerAdvancedCarryForwardCreatorHelp();

    const translations = getLocaleStrings("en");

    expect(
      translations.pehelp[CARRY_FORWARD_ENABLED_PROPERTY],
    ).toContain("build this question's choice list");
    expect(
      translations.pehelp[CARRY_FORWARD_SOURCES_PROPERTY],
    ).toContain("earlier choice questions");
    expect(
      translations.pehelp[CARRY_FORWARD_SOURCES_PROPERTY],
    ).toContain('href="/data-lists"');
    expect(
      translations.pehelp[CARRY_FORWARD_SOURCES_PROPERTY],
    ).toContain("always contribute only the respondent's selected options");
    expect(translations.pehelp[CARRY_FORWARD_MODE_PROPERTY]).toContain(
      "Selected",
    );
    expect(translations.pehelp[CARRY_FORWARD_MODE_PROPERTY]).toContain(
      "Lazy-loaded sources",
    );
    expect(translations.pehelp[CARRY_FORWARD_MODE_PROPERTY]).toContain(
      'href="/data-lists"',
    );
    expect(translations.pehelp[CARRY_FORWARD_MODE_PROPERTY]).toContain(
      "including selections that are not on the currently loaded page",
    );
    expect(translations.pehelp[CARRY_FORWARD_MODE_PROPERTY]).toContain(
      "even if this setting is All or Unselected",
    );
    expect(translations.pehelp[CARRY_FORWARD_MODE_PROPERTY]).toContain(
      "Inline (fully loaded) sources still honor All and Unselected",
    );
    expect(
      translations.pehelp[CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY],
    ).toContain("Choices order");
    expect(
      translations.pehelp[CARRY_FORWARD_MAX_CHOICES_PROPERTY],
    ).toContain("Priority items are always included");
  });

  it("builds the Data Lists pehelp link via withBasePath for subfolder deploys", () => {
    withBasePathMock.mockImplementation((path: string) => `/hub${path}`);

    registerAdvancedCarryForwardCreatorHelp();

    const translations = getLocaleStrings("en");

    expect(withBasePathMock).toHaveBeenCalledWith("/data-lists");
    expect(translations.pehelp[CARRY_FORWARD_MODE_PROPERTY]).toContain(
      'href="/hub/data-lists"',
    );
    expect(translations.pehelp[CARRY_FORWARD_SOURCES_PROPERTY]).toContain(
      'href="/hub/data-lists"',
    );
  });

  it("clears pehelp text on reset instead of leaving it from a prior register", () => {
    registerAdvancedCarryForwardCreatorHelp();
    resetAdvancedCarryForwardCreatorHelpForTests();

    const translations = getLocaleStrings("en");

    expect(
      translations.pehelp[CARRY_FORWARD_ENABLED_PROPERTY],
    ).toBeUndefined();
    expect(
      translations.pehelp[CARRY_FORWARD_SOURCES_PROPERTY],
    ).toBeUndefined();
    expect(
      translations.pehelp[CARRY_FORWARD_MODE_PROPERTY],
    ).toBeUndefined();
    expect(
      translations.pehelp[CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY],
    ).toBeUndefined();
    expect(
      translations.pehelp[CARRY_FORWARD_MAX_CHOICES_PROPERTY],
    ).toBeUndefined();
  });
});
