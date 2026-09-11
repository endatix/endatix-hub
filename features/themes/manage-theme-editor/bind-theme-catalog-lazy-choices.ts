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
/** Holds the live unbind, so re-binding one survey returns it instead of stacking. */
const BOUND_KEY = "__endatixThemeCatalogLazyBound";
const NOOP = () => {};

type Unbind = () => void;

/** Runs `act` with the `themeName` editor hidden from `getQuestionByName`. */
function withHiddenThemeChooser<T>(survey: Model, act: () => T): T {
  const lookup = survey.getQuestionByName;
  survey.getQuestionByName = ((name: string) =>
    name === THEME_NAME_PROPERTY
      ? undefined
      : lookup.call(survey, name)) as Model["getQuestionByName"];
  try {
    return act();
  } finally {
    survey.getQuestionByName = lookup;
  }
}

/**
 * `addTheme` assigns `availableThemes`, which looks up `themeName` and rewrites
 * `choices` (that reset leaves SurveyJS on "Loading..."). Hide the chooser for
 * the call so Themes[] still updates and `runExpressions` still runs.
 */
function wrapAddThemeForLazyChooser(
  plugin: ThemeTabPlugin,
  survey: Model,
  question: LazyChoiceQuestion,
): Unbind {
  const originalAddTheme = plugin.addTheme;

  plugin.addTheme = ((theme, setAsDefault) =>
    question.choicesLazyLoadEnabled
      ? withHiddenThemeChooser(survey, () =>
          originalAddTheme.call(plugin, theme, setAsDefault),
        )
      : originalAddTheme.call(
          plugin,
          theme,
          setAsDefault,
        )) as ThemeTabPlugin["addTheme"];

  return () => {
    plugin.addTheme = originalAddTheme;
  };
}

const activeUnbinds = new WeakMap<ThemeTabPlugin, Unbind>();

function unbindPrevious(plugin: ThemeTabPlugin): void {
  activeUnbinds.get(plugin)?.();
}

/**
 * Pages the tenant theme catalog into the Theme Editor `themeName` chooser.
 * Returns the unbind for the hook cleanup - re-binding the same survey hands
 * back the live one, and binding a rebuilt survey supersedes the old binding.
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

  const bound = survey[BOUND_KEY] as Unbind | undefined;
  if (bound) {
    return bound;
  }

  // The plugin rebuilds `propertyGrid.survey` on every Themes tab activation, so
  // drop the previous survey's handlers before wrapping `addTheme` again.
  unbindPrevious(plugin);

  question.choicesLazyLoadEnabled = true;
  question.choicesLazyLoadPageSize = DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE;
  // `GET /themes` has no name filter, so a search box could only match the page
  // already loaded. Re-enable it together with server-side filtering.
  question.searchEnabled = false;
  const unbindLoadingObserver = bindLoadingIndicatorObserver(question);
  question.choices = [DEFAULT_THEME_CHOICE];

  const unwrapAddTheme = wrapAddThemeForLazyChooser(plugin, survey, question);

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

  const unbind = () => {
    unbindLoadingObserver();
    survey.onChoicesLazyLoad.remove(onChoicesLazyLoad);
    unwrapAddTheme();
    delete survey[BOUND_KEY];
    if (activeUnbinds.get(plugin) === unbind) {
      activeUnbinds.delete(plugin);
    }
  };

  survey[BOUND_KEY] = unbind;
  activeUnbinds.set(plugin, unbind);
  return unbind;
}
