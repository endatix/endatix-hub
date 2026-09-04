import { describe, expect, it } from "vitest";
import {
  ENDATIX_CREATOR_TAB,
  SURVEY_CREATOR_BUILT_IN_TAB,
} from "@/lib/survey-js";
import { resolveCreatorTab } from "../resolve-creator-tab";

const creatorWithTabs = (...ids: string[]) => ({
  tabs: ids.map((id) => ({ id })),
});

describe("resolveCreatorTab", () => {
  it("keeps a tab that is on the creator", () => {
    const creator = creatorWithTabs("designer", "preview");

    expect(
      resolveCreatorTab(creator, SURVEY_CREATOR_BUILT_IN_TAB.preview),
    ).toBe(SURVEY_CREATOR_BUILT_IN_TAB.preview);
  });

  it("canonicalizes a legacy id before matching", () => {
    const creator = creatorWithTabs("designer", "preview");

    expect(resolveCreatorTab(creator, "test")).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.preview,
    );
  });

  it("matches tabs exposed by name rather than id", () => {
    const creator = { tabs: [{ name: ENDATIX_CREATOR_TAB.diagnostics }] };

    expect(resolveCreatorTab(creator, ENDATIX_CREATOR_TAB.diagnostics)).toBe(
      ENDATIX_CREATOR_TAB.diagnostics,
    );
  });

  it("falls back to Design when the tab is absent", () => {
    const creator = creatorWithTabs("designer");

    expect(resolveCreatorTab(creator, ENDATIX_CREATOR_TAB.diagnostics)).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.designer,
    );
  });

  it("falls back to Design for unknown ids", () => {
    expect(resolveCreatorTab(creatorWithTabs("mystery"), "mystery")).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.designer,
    );
  });
});
