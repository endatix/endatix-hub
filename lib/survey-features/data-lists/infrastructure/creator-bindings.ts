import {
  AfterPropertyChangedEvent,
  SurveyCreatorModel,
  SurveyInstanceCreatedEvent,
} from "survey-creator-core";
import {
  DATA_LIST_PROPERTY_NAME,
  PROPERTY_GRID_LAZY_REFRESH_PROPERTY_NAMES,
} from "../constants";
import { parseDataListId } from "./data-list-survey-integration";
import { bindDataListsToSurvey } from "./survey-bindings";
import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import { bindConvertInlineChoicesTitleActions } from "./convert-inline-choices-title-actions";
import { bindDataListCreatorTranslations } from "./creator-translation-bindings";
import {
  refreshPropertyGridLazyChoices,
  refreshPropertyGridLazyChoicesForCreator,
} from "./property-grid-lazy-choice-registry";
import { registerDataListGlobals } from "./registry";

export { setDataListPropertyChoices } from "./data-list-property-choices";

const DATA_LIST_CREATOR_BOUND_KEY = "__endatixDataListsCreatorBound";

const LAZY_REFRESH_PROPERTY_NAMES = new Set<string>(
  PROPERTY_GRID_LAZY_REFRESH_PROPERTY_NAMES,
);

export function bindDataListsToCreator(
  creator: SurveyCreatorModel,
  deps: ExtensionRuntimeDeps,
): () => void {
  registerDataListGlobals();
  const creatorWithFlags = creator as SurveyCreatorModel &
    Record<string, unknown>;
  if (creatorWithFlags[DATA_LIST_CREATOR_BOUND_KEY]) {
    return () => {};
  }
  creatorWithFlags[DATA_LIST_CREATOR_BOUND_KEY] = true;

  const creatorSurveyDisposers = new Map<string, () => void>();

  const onPropertyChanged = (
    _: SurveyCreatorModel,
    options: AfterPropertyChangedEvent,
  ) => {
    if (options.propertyName === DATA_LIST_PROPERTY_NAME) {
      const question = options.element;
      if (question) {
        const dataListId = parseDataListId(options.value);
        const creatorQuestion = question as unknown as Record<string, unknown>;
        creatorQuestion.choicesLazyLoadEnabled = Boolean(dataListId);
        if (dataListId) {
          creatorQuestion.choices = [];
        }
      }
    }

    if (LAZY_REFRESH_PROPERTY_NAMES.has(options.propertyName)) {
      refreshPropertyGridLazyChoicesForCreator(creator);
    }
  };

  const bindSurveyForArea = (
    area: string,
    survey: Parameters<typeof bindDataListsToSurvey>[0],
  ) => {
    const previousDispose = creatorSurveyDisposers.get(area);
    previousDispose?.();

    const dispose = bindDataListsToSurvey(survey, {
      deps,
      getDesignerSurvey: () => creator.survey ?? null,
    });
    creatorSurveyDisposers.set(area, dispose);
  };

  const handleSurveyInstanceCreated = (
    _: unknown,
    options: SurveyInstanceCreatedEvent,
  ) => {
    if (options.area.startsWith("theme-tab")) {
      return;
    }

    bindSurveyForArea(options.area, options.survey);

    if (options.area === "property-grid") {
      const designerSurvey = creator.survey;
      const editingObj = options.element ?? options.survey.editingObj;
      if (designerSurvey && editingObj != null) {
        refreshPropertyGridLazyChoices({
          designerSurvey,
          propertyGridSurvey: options.survey,
          editingObj,
        });
      }
    }
  };

  creator.onAfterPropertyChanged.add(onPropertyChanged);
  creator.onSurveyInstanceCreated.add(handleSurveyInstanceCreated);

  const disposeConvertTitleActions =
    bindConvertInlineChoicesTitleActions(creator);
  const disposeTranslationCsv = bindDataListCreatorTranslations(creator);

  if (creator.survey) {
    bindSurveyForArea("__creator-initial-survey", creator.survey);
  }

  return () => {
    disposeConvertTitleActions();
    disposeTranslationCsv();
    creator.onAfterPropertyChanged.remove(onPropertyChanged);
    creator.onSurveyInstanceCreated.remove(handleSurveyInstanceCreated);
    creatorSurveyDisposers.forEach((dispose) => dispose?.());
    creatorSurveyDisposers.clear();
    creatorWithFlags[DATA_LIST_CREATOR_BOUND_KEY] = false;
  };
}
