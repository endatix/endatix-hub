import { describe, expect, it, vi } from "vitest";
import { SurveyCreatorModel } from "survey-creator-core";
import { SURVEY_CREATOR_BUILT_IN_TAB } from "@/lib/survey-js";
import { loadTabFromUrl } from "../load-tab-from-url";
import { bindSetTabToUrl } from "../set-tab-to-url";

const newCreator = () =>
  new SurveyCreatorModel({ showDesignerTab: true, showPreview: true });

describe("loadTabFromUrl", () => {
  it("applies the preview query as the Creator preview tab", () => {
    const creator = newCreator();

    expect(loadTabFromUrl(creator, "preview")).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.preview,
    );
    expect(creator.activeTab).toBe(SURVEY_CREATOR_BUILT_IN_TAB.preview);
  });

  it("falls back to Design when the plugin tab is not registered", () => {
    const creator = newCreator();

    expect(loadTabFromUrl(creator, "diagnostics")).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.designer,
    );
    expect(creator.activeTab).toBe(SURVEY_CREATOR_BUILT_IN_TAB.designer);
  });

  it("falls back to Design for a built-in tab the Creator hides", () => {
    const creator = new SurveyCreatorModel({
      showDesignerTab: true,
      showThemeTab: false,
    });

    expect(loadTabFromUrl(creator, "theme")).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.designer,
    );
    expect(creator.activeTab).toBe(SURVEY_CREATOR_BUILT_IN_TAB.designer);
  });
});

describe("bindSetTabToUrl", () => {
  it("writes the slug when the active tab changes", () => {
    const creator = newCreator();
    const onQueryValue = vi.fn();

    bindSetTabToUrl(creator, onQueryValue);
    creator.activeTab = SURVEY_CREATOR_BUILT_IN_TAB.preview;

    expect(onQueryValue).toHaveBeenCalledWith("preview");
  });

  it("omits the query when returning to Design", () => {
    const creator = newCreator();
    creator.activeTab = SURVEY_CREATOR_BUILT_IN_TAB.preview;
    const onQueryValue = vi.fn();

    bindSetTabToUrl(creator, onQueryValue);
    creator.activeTab = SURVEY_CREATOR_BUILT_IN_TAB.designer;

    expect(onQueryValue).toHaveBeenCalledWith(null);
  });

  it("stops writing once unsubscribed", () => {
    const creator = newCreator();
    const onQueryValue = vi.fn();

    bindSetTabToUrl(creator, onQueryValue)();
    creator.activeTab = SURVEY_CREATOR_BUILT_IN_TAB.preview;

    expect(onQueryValue).not.toHaveBeenCalled();
  });
});
