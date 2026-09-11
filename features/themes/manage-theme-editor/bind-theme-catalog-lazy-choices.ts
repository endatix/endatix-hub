import type { ThemeTabPlugin } from "survey-creator-core";
import type { ChoicesLazyLoadEvent, Model } from "survey-core";
import { StoredTheme } from "@/features/themes/types";
import {
  DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE,
  mapSurveyJsLazyLoadTotal,
} from "@/lib/survey-features/infrastructure/choices-lazy-load-page";
import {
  DEFAULT_THEME_CHOICE,
  loadThemeCatalogChoicePage,
} from "./load-theme-catalog-choice-page";

const THEME_NAME_PROPERTY = "themeName";
const BOUND_KEY = "__endatixThemeCatalogLazyBound";
const NOOP = () => {};

type ScrollContainer = {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

type LazyChoiceQuestion = {
  choicesLazyLoadEnabled?: boolean;
  choicesLazyLoadPageSize?: number;
  searchEnabled?: boolean;
  choices?: unknown[];
  dropdownListModel?: {
    updateQuestionChoices?: () => void;
    itemsSettings?: { items?: unknown[] };
    popupModel?: {
      isVisible?: boolean;
      onVisibilityChanged?: {
        add: (
          handler: (sender: unknown, options: { isVisible: boolean }) => void,
        ) => void;
        remove: (
          handler: (sender: unknown, options: { isVisible: boolean }) => void,
        ) => void;
      };
    };
    listModel?: {
      scrollableContainer?: ScrollContainer | null;
      setLoadingIndicatorVisibilityObserver?: (
        handler: (isVisible: boolean) => void,
      ) => void;
      loadingIndicator?: {
        intersectionVisibilityObserver?: { disconnect: () => void };
        initLoadingIndicatorVisibilityObserver?: (
          handler: (isVisible: boolean) => void,
        ) => void;
      };
    };
  };
};

const LOADING_ROW_SCROLL_PX = 48;

function isScrolledToLoadingRow(
  container: ScrollContainer | null | undefined,
): boolean {
  if (!container) {
    return false;
  }
  return (
    container.scrollHeight - container.scrollTop - container.clientHeight <
    LOADING_ROW_SCROLL_PX
  );
}

/**
 * SurveyJS observes the loading row against the viewport, so it fires when the
 * row is clipped in the list or when the popup closes. Only fetch more when the
 * popup is open and the list is scrolled to that row. The handler must still be
 * a function — otherwise IntersectionObserver throws `handler is not a function`.
 */
function bindLoadingIndicatorObserver(
  question: LazyChoiceQuestion,
): () => void {
  const dropdown = question.dropdownListModel;
  const listModel = dropdown?.listModel;
  if (!dropdown || !listModel?.setLoadingIndicatorVisibilityObserver) {
    return NOOP;
  }

  const requestNextPageIfNeeded = () => {
    if (!dropdown.popupModel?.isVisible) {
      return;
    }
    if (!isScrolledToLoadingRow(listModel.scrollableContainer)) {
      return;
    }
    dropdown.updateQuestionChoices?.();
  };

  const onVisible = (isVisible: boolean) => {
    if (isVisible) {
      requestNextPageIfNeeded();
    }
  };

  listModel.setLoadingIndicatorVisibilityObserver(onVisible);
  const indicator = listModel.loadingIndicator;
  indicator?.intersectionVisibilityObserver?.disconnect();
  indicator?.initLoadingIndicatorVisibilityObserver?.(onVisible);

  const onPopupVisibility = (_: unknown, options: { isVisible: boolean }) => {
    const container = listModel.scrollableContainer;
    if (!container?.addEventListener || !container.removeEventListener) {
      return;
    }
    if (options.isVisible) {
      container.addEventListener("scroll", requestNextPageIfNeeded);
      return;
    }
    container.removeEventListener("scroll", requestNextPageIfNeeded);
  };
  dropdown.popupModel?.onVisibilityChanged?.add(onPopupVisibility);

  return () => {
    const container = listModel.scrollableContainer;
    container?.removeEventListener?.("scroll", requestNextPageIfNeeded);
    dropdown.popupModel?.onVisibilityChanged?.remove(onPopupVisibility);
  };
}

export function bindThemeCatalogLazyChoices(
  plugin: ThemeTabPlugin,
  registerThemes: (themes: StoredTheme[]) => void,
): () => void {
  const survey = plugin.propertyGrid?.survey as
    | (Model & Record<string, unknown>)
    | undefined;
  const question = survey?.getQuestionByName(THEME_NAME_PROPERTY) as
    | LazyChoiceQuestion
    | undefined;
  if (!survey || !question) {
    return NOOP;
  }

  if (survey[BOUND_KEY]) {
    return NOOP;
  }
  survey[BOUND_KEY] = true;

  question.choicesLazyLoadEnabled = true;
  question.choicesLazyLoadPageSize = DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE;
  question.searchEnabled = false;
  const unbindLoadingObserver = bindLoadingIndicatorObserver(question);
  question.choices = [DEFAULT_THEME_CHOICE];

  // addTheme → availableThemes setter → onAvailableThemesChanged rewrites
  // themeName.choices and may setTheme(default) when the current value is not
  // in that static list. Still run expressions so Header View Basic hides
  // advanced-only editors (height, cover width, …).
  const originalOnAvailableThemesChanged = plugin.onAvailableThemesChanged;
  if (typeof originalOnAvailableThemesChanged === "function") {
    plugin.onAvailableThemesChanged = () => {
      survey.runExpressions();
    };
  }

  let loadedCount = 0;
  let loadGeneration = 0;

  const onChoicesLazyLoad = async (_: Model, options: ChoicesLazyLoadEvent) => {
    if (options.question.name !== THEME_NAME_PROPERTY) {
      return;
    }

    if (options.skip === 0) {
      loadedCount = 0;
      loadGeneration += 1;
      const itemsSettings = (options.question as LazyChoiceQuestion)
        .dropdownListModel?.itemsSettings;
      if (itemsSettings) {
        itemsSettings.items = [];
      }
    }
    const generation = loadGeneration;

    const page = await loadThemeCatalogChoicePage(
      options.skip,
      options.take,
      registerThemes,
    );
    if (generation !== loadGeneration) {
      return;
    }

    loadedCount += page.items.length;

    options.setItems(
      page.items,
      page.hasNextPage
        ? mapSurveyJsLazyLoadTotal({
            skip: options.skip,
            take: options.take,
            itemCount: page.items.length,
            totalRecords: page.totalRecords,
            hasNextPage: true,
          })
        : loadedCount,
    );
  };

  survey.onChoicesLazyLoad.add(onChoicesLazyLoad);

  return () => {
    unbindLoadingObserver();
    survey.onChoicesLazyLoad.remove(onChoicesLazyLoad);
    if (typeof originalOnAvailableThemesChanged === "function") {
      plugin.onAvailableThemesChanged = originalOnAvailableThemesChanged;
    }
    survey[BOUND_KEY] = false;
  };
}
