import { describe, expect, it, vi } from "vitest";
import { SurveyCreatorModel } from "survey-creator-core";
import { SURVEY_CREATOR_BUILT_IN_TAB } from "@/lib/survey-js";
import {
  applyCreatorTabFromQuery,
  bindCreatorTabQuerySync,
} from "../creator-bindings";

describe("creator tab bindings", () => {
  it("applies preview query as the Creator preview tab", () => {
    const creator = new SurveyCreatorModel({
      showPreview: true,
      showDesignerTab: true,
    });

    const resolved = applyCreatorTabFromQuery(creator, "preview");

    expect(resolved).toBe(SURVEY_CREATOR_BUILT_IN_TAB.preview);
    expect(creator.activeTab).toBe(SURVEY_CREATOR_BUILT_IN_TAB.preview);
  });

  it("falls back to designer when diagnostics is not registered", () => {
    const creator = new SurveyCreatorModel({
      showDesignerTab: true,
    });

    const resolved = applyCreatorTabFromQuery(creator, "diagnostics");

    expect(resolved).toBe(SURVEY_CREATOR_BUILT_IN_TAB.designer);
    expect(creator.activeTab).toBe(SURVEY_CREATOR_BUILT_IN_TAB.designer);
  });

  it("notifies when the active tab changes", () => {
    const creator = new SurveyCreatorModel({
      showPreview: true,
      showDesignerTab: true,
    });
    const onTabId = vi.fn();

    bindCreatorTabQuerySync(creator, onTabId);
    creator.activeTab = SURVEY_CREATOR_BUILT_IN_TAB.preview;

    expect(onTabId).toHaveBeenCalledWith(SURVEY_CREATOR_BUILT_IN_TAB.preview);
  });
});
