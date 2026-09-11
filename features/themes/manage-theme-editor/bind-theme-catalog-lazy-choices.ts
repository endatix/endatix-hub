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

type LazyChoiceQuestion = {
  choicesLazyLoadEnabled?: boolean;
  choicesLazyLoadPageSize?: number;
  searchEnabled?: boolean;
  choices?: unknown[];
};

/**
 * Pages the tenant theme catalog into the Theme Editor `themeName` chooser.
 * Returns an unbind for the hook cleanup; binding twice on one property grid
 * survey is a no-op.
 */
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

  question.choicesLazyLoadEnabled = true;
  question.choicesLazyLoadPageSize = DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE;
  // `GET /themes` has no name filter, so a search box could only match the page
  // already loaded. Re-enable it together with server-side filtering.
  question.searchEnabled = false;
  question.choices = [DEFAULT_THEME_CHOICE];

  if (survey[BOUND_KEY]) {
    return NOOP;
  }
  survey[BOUND_KEY] = true;

  // SurveyJS clears the "Loading..." footer only when the items it has
  // accumulated equal the reported total, so the last page reports that count.
  let loadedCount = 0;

  const onChoicesLazyLoad = async (_: Model, options: ChoicesLazyLoadEvent) => {
    if (options.question.name !== THEME_NAME_PROPERTY) {
      return;
    }

    if (options.skip === 0) {
      loadedCount = 0;
    }

    const page = await loadThemeCatalogChoicePage(
      options.skip,
      options.take,
      registerThemes,
    );
    loadedCount += page.items.length;

    options.setItems(
      page.items,
      page.hasNextPage
        ? mapSurveyJsLazyLoadTotal({
            skip: options.skip,
            take: options.take,
            itemCount: page.items.length,
            totalRecords: loadedCount,
            hasNextPage: true,
          })
        : loadedCount,
    );
  };

  survey.onChoicesLazyLoad.add(onChoicesLazyLoad);

  return () => {
    survey.onChoicesLazyLoad.remove(onChoicesLazyLoad);
    survey[BOUND_KEY] = false;
  };
}
