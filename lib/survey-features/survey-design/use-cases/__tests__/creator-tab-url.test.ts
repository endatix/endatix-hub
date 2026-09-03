import { describe, expect, it, vi } from "vitest";
import { SurveyCreatorModel } from "survey-creator-core";
import {
  SURVEY_CREATOR_BUILT_IN_TAB,
  DEFAULT_CREATOR_TAB,
} from "@/lib/survey-js";
import { loadTabFromUrl } from "../load-tab-from-url";
import { bindSetTabToUrl, setTabToUrlQueryValue } from "../set-tab-to-url";

describe("loadTabFromUrl", () => {
  it("applies preview query as the Creator preview tab", () => {
    const creator = new SurveyCreatorModel({
      showPreview: true,
      showDesignerTab: true,
    });

    const resolved = loadTabFromUrl(creator, "preview");

    expect(resolved).toBe(SURVEY_CREATOR_BUILT_IN_TAB.preview);
    expect(creator.activeTab).toBe(SURVEY_CREATOR_BUILT_IN_TAB.preview);
  });

  it("falls back to designer when diagnostics is not registered", () => {
    const creator = new SurveyCreatorModel({
      showDesignerTab: true,
    });

    const resolved = loadTabFromUrl(creator, "diagnostics");

    expect(resolved).toBe(SURVEY_CREATOR_BUILT_IN_TAB.designer);
    expect(creator.activeTab).toBe(SURVEY_CREATOR_BUILT_IN_TAB.designer);
  });
});

describe("setTabToUrlQueryValue", () => {
  it("omits the query for Design", () => {
    expect(setTabToUrlQueryValue(DEFAULT_CREATOR_TAB)).toBeNull();
  });
});

describe("bindSetTabToUrl", () => {
  it("writes the query when the active tab changes", () => {
    const creator = new SurveyCreatorModel({
      showPreview: true,
      showDesignerTab: true,
    });
    const onQueryValue = vi.fn();

    bindSetTabToUrl(creator, onQueryValue);
    creator.activeTab = SURVEY_CREATOR_BUILT_IN_TAB.preview;

    expect(onQueryValue).toHaveBeenCalledWith("preview");
  });

  it("omits tab when returning to Design", () => {
    const creator = new SurveyCreatorModel({
      showPreview: true,
      showDesignerTab: true,
    });
    creator.activeTab = SURVEY_CREATOR_BUILT_IN_TAB.preview;
    const onQueryValue = vi.fn();

    bindSetTabToUrl(creator, onQueryValue);
    creator.activeTab = SURVEY_CREATOR_BUILT_IN_TAB.designer;

    expect(onQueryValue).toHaveBeenCalledWith(null);
  });

  it("binds once per creator", () => {
    const creator = new SurveyCreatorModel({
      showPreview: true,
      showDesignerTab: true,
    });
    const onQueryValue = vi.fn();

    bindSetTabToUrl(creator, onQueryValue);
    bindSetTabToUrl(creator, onQueryValue);
    creator.activeTab = SURVEY_CREATOR_BUILT_IN_TAB.preview;

    expect(onQueryValue).toHaveBeenCalledTimes(1);
  });
});
