import type { ThemeTabPlugin } from "survey-creator-core";
import type { ChoicesLazyLoadEvent, Model } from "survey-core";
import { StoredTheme } from "@/features/themes/types";
import {
  DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE,
  mapSurveyJsLazyLoadTotal,
} from "@/lib/survey-features/infrastructure/choices-lazy-load-page";
import {
  applyUniqueChoices,
  bindLoadingIndicatorObserver,
  choiceValue,
  existingChoiceKeys,
  markAllChoicesLoaded,
  resetLazyChoices,
  uniqueChoices,
  type LazyChoiceQuestion,
} from "@/lib/survey-features/infrastructure/choices-lazy-load-dropdown";
import {
  DEFAULT_THEME_CHOICE,
  loadThemeCatalogChoicePage,
} from "./load-theme-catalog-choice-page";

const THEME_NAME_PROPERTY = "themeName";
const BOUND_KEY = "__endatixThemeCatalogLazyBound";
const NOOP = () => {};

/** `onAvailableThemesChanged` is private in the typings; we patch it by name. */
type ThemeChooserHost = {
  onAvailableThemesChanged?: (availableThemes: string[]) => void;
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

  if (survey[BOUND_KEY]) {
    return NOOP;
  }
  survey[BOUND_KEY] = true;

  question.choicesLazyLoadEnabled = true;
  question.choicesLazyLoadPageSize = DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE;
  // `GET /themes` has no name filter, so a search box could only match the page
  // already loaded. Re-enable it together with server-side filtering.
  question.searchEnabled = false;
  const unbindLoadingObserver = bindLoadingIndicatorObserver(question);
  question.choices = [DEFAULT_THEME_CHOICE];

  // addTheme → availableThemes setter → onAvailableThemesChanged rewrites
  // themeName.choices and may setTheme(default) when the current value is not
  // in that static list. Still run expressions so Header View Basic hides
  // advanced-only editors (height, cover width, …).
  const host = plugin as unknown as ThemeChooserHost;
  const originalOnAvailableThemesChanged = host.onAvailableThemesChanged;
  if (typeof originalOnAvailableThemesChanged === "function") {
    host.onAvailableThemesChanged = () => survey.runExpressions();
  }

  let loadedCount = 0;
  let loadGeneration = 0;

  const onChoicesLazyLoad = async (_: Model, options: ChoicesLazyLoadEvent) => {
    if (options.question.name !== THEME_NAME_PROPERTY) {
      return;
    }

    const lazyQuestion = options.question as LazyChoiceQuestion;
    const isFirstPage = options.skip === 0;
    if (isFirstPage) {
      loadedCount = 0;
      loadGeneration += 1;
      resetLazyChoices(lazyQuestion);
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

    // A page can repeat a theme the chooser already lists (a rename between
    // pages, or a re-request of the same skip); setItems only ever appends.
    const alreadyListed = existingChoiceKeys(lazyQuestion);
    const items = isFirstPage
      ? page.items
      : page.items.filter((item) => !alreadyListed.has(choiceValue(item)));

    loadedCount = Math.max(
      loadedCount + items.length,
      uniqueChoices([...alreadyListed, ...items]).length,
    );

    options.setItems(
      items,
      page.hasNextPage
        ? mapSurveyJsLazyLoadTotal({
            skip: options.skip,
            take: options.take,
            itemCount: items.length,
            totalRecords: page.totalRecords,
            hasNextPage: true,
          })
        : loadedCount,
    );

    const unique = applyUniqueChoices(lazyQuestion);
    if (!page.hasNextPage) {
      loadedCount = unique.length;
      markAllChoicesLoaded(lazyQuestion, loadedCount);
    }
  };

  survey.onChoicesLazyLoad.add(onChoicesLazyLoad);

  return () => {
    unbindLoadingObserver();
    survey.onChoicesLazyLoad.remove(onChoicesLazyLoad);
    if (typeof originalOnAvailableThemesChanged === "function") {
      host.onAvailableThemesChanged = originalOnAvailableThemesChanged;
    }
    survey[BOUND_KEY] = false;
  };
}
