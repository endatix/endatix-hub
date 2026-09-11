import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SurveyCreatorModel } from "survey-creator-core";
import { SURVEY_CREATOR_BUILT_IN_TAB } from "@/lib/survey-js";
import { useCreatorTabUrl } from "../ui/use-creator-tab-url";

let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

const newCreator = () =>
  new SurveyCreatorModel({ showDesignerTab: true, showPreview: true });

describe("useCreatorTabUrl", () => {
  beforeEach(() => {
    searchParams = new URLSearchParams();
    window.history.replaceState(null, "", "/forms/1/design");
    vi.spyOn(window.history, "replaceState");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes preview to the URL with history.replaceState", () => {
    // Arrange
    const creator = newCreator();
    renderHook(() => useCreatorTabUrl(creator));

    // Act
    act(() => {
      creator.activeTab = SURVEY_CREATOR_BUILT_IN_TAB.preview;
    });

    // Assert
    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/forms/1/design?tab=preview",
    );
  });

  it("omits tab from the URL when returning to Design", () => {
    // Arrange
    window.history.replaceState(null, "", "/forms/1/design?tab=preview");
    searchParams = new URLSearchParams("tab=preview");
    const creator = newCreator();
    creator.activeTab = SURVEY_CREATOR_BUILT_IN_TAB.preview;
    renderHook(() => useCreatorTabUrl(creator));
    vi.mocked(window.history.replaceState).mockClear();

    // Act
    act(() => {
      creator.activeTab = SURVEY_CREATOR_BUILT_IN_TAB.designer;
    });

    // Assert
    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/forms/1/design",
    );
  });

  it("keeps other search params and the hash", () => {
    // Arrange
    window.history.replaceState(null, "", "/forms/1/design?foo=bar#toolbox");
    const creator = newCreator();
    renderHook(() => useCreatorTabUrl(creator));
    vi.mocked(window.history.replaceState).mockClear();

    // Act
    act(() => {
      creator.activeTab = SURVEY_CREATOR_BUILT_IN_TAB.preview;
    });

    // Assert
    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/forms/1/design?foo=bar&tab=preview#toolbox",
    );
  });

  it("does not call replaceState when the tab query is already current", () => {
    // Arrange
    window.history.replaceState(null, "", "/forms/1/design?tab=preview");
    searchParams = new URLSearchParams("tab=preview");
    const creator = newCreator();
    creator.activeTab = SURVEY_CREATOR_BUILT_IN_TAB.preview;
    renderHook(() => useCreatorTabUrl(creator));
    vi.mocked(window.history.replaceState).mockClear();

    // Act
    act(() => {
      creator.activeTab = SURVEY_CREATOR_BUILT_IN_TAB.preview;
    });

    // Assert
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });
});
