import type { ThemeTabPlugin } from "survey-creator-core";
import type { ChoicesLazyLoadEvent, Model } from "survey-core";
import { StoredTheme } from "@/features/themes/types";
import { DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE } from "@/lib/survey-features/infrastructure/choices-lazy-load-page";
import { loadThemeCatalogChoicePage } from "./load-theme-catalog-choice-page";
import { DEFAULT_THEME_NAME } from "./parse-stored-theme";

const THEME_NAME_PROPERTY = "themeName";
const BOUND_KEY = "__endatixThemeCatalogLazyBound";

export function bindThemeCatalogLazyChoices(
  plugin: ThemeTabPlugin,
  registerThemes: (themes: StoredTheme[]) => void,
): void {
  const survey = plugin.propertyGrid?.survey as
    | (Model & Record<string, unknown>)
    | undefined;
  const question = survey?.getQuestionByName(THEME_NAME_PROPERTY) as
    | {
        choicesLazyLoadEnabled?: boolean;
        choicesLazyLoadPageSize?: number;
        choices?: unknown[];
      }
    | undefined;
  if (!survey || !question) {
    return;
  }

  question.choicesLazyLoadEnabled = true;
  question.choicesLazyLoadPageSize = DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE;
  question.choices = [{ value: DEFAULT_THEME_NAME, text: "Default" }];

  if (survey[BOUND_KEY]) {
    return;
  }
  survey[BOUND_KEY] = true;

  const onChoicesLazyLoad = async (_: Model, options: ChoicesLazyLoadEvent) => {
    if (options.question.name !== THEME_NAME_PROPERTY) {
      return;
    }

    const page = await loadThemeCatalogChoicePage(
      options.skip,
      options.take,
      options.filter,
      registerThemes,
    );
    options.setItems(page.items, page.total);
  };

  survey.onChoicesLazyLoad.add(onChoicesLazyLoad);
}
