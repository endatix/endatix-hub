import { describe, expect, it } from "vitest";
import {
  ENDATIX_CREATOR_TAB,
  SURVEY_CREATOR_BUILT_IN_TAB,
} from "@/lib/survey-js";
import { resolveCreatorTab } from "../resolve-creator-tab";

describe("resolveCreatorTab", () => {
  it("keeps a tab that exists on the creator", () => {
    const creator = {
      tabs: [
        { id: SURVEY_CREATOR_BUILT_IN_TAB.designer },
        { name: SURVEY_CREATOR_BUILT_IN_TAB.preview },
      ],
    };

    expect(
      resolveCreatorTab(creator, SURVEY_CREATOR_BUILT_IN_TAB.preview),
    ).toBe(SURVEY_CREATOR_BUILT_IN_TAB.preview);
  });

  it("uses getPlugin when tabs omit the id", () => {
    const creator = {
      tabs: [],
      getPlugin: (name: string) =>
        name === SURVEY_CREATOR_BUILT_IN_TAB.preview ? {} : undefined,
    };

    expect(
      resolveCreatorTab(creator, SURVEY_CREATOR_BUILT_IN_TAB.preview),
    ).toBe(SURVEY_CREATOR_BUILT_IN_TAB.preview);
  });

  it("falls back to designer when the tab is missing", () => {
    const creator = {
      tabs: [{ id: SURVEY_CREATOR_BUILT_IN_TAB.designer }],
    };

    expect(resolveCreatorTab(creator, ENDATIX_CREATOR_TAB.diagnostics)).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.designer,
    );
  });

  it("falls back to designer for unknown ids", () => {
    const creator = {
      tabs: [{ id: "mystery" }],
    };

    expect(resolveCreatorTab(creator, "mystery")).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.designer,
    );
  });
});
