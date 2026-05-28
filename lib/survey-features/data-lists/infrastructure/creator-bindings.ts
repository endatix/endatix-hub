import {
  AfterPropertyChangedEvent,
  SurveyCreatorModel,
  SurveyInstanceCreatedEvent,
} from "survey-creator-core";
import { DATA_LIST_PROPERTY_NAME } from "../constants";
import { parseDataListId } from "./data-list-survey-integration";
import { bindDataListsToSurvey } from "./survey-bindings";
import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import { bindConvertInlineChoicesTitleActions } from "./convert-inline-choices-title-actions";
import { registerDataListGlobals } from "./registry";

export { setDataListPropertyChoices } from "./data-list-property-choices";

const DATA_LIST_CREATOR_BOUND_KEY = "__endatixDataListsCreatorBound";

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

  const onDataListChanged = (
    _: SurveyCreatorModel,
    options: AfterPropertyChangedEvent,
  ) => {
    if (options.propertyName !== DATA_LIST_PROPERTY_NAME) {
      return;
    }

    const question = options.element;
    if (!question) {
      return;
    }

    const dataListId = parseDataListId(options.value);
    const creatorQuestion = question as unknown as Record<string, unknown>;
    creatorQuestion.choicesLazyLoadEnabled = Boolean(dataListId);
    if (dataListId) {
      creatorQuestion.choices = [];
    }
  };

  const handleSurveyInstanceCreated = (
    _: unknown,
    options: SurveyInstanceCreatedEvent,
  ) => {
    if (options.area.startsWith("theme-tab")) {
      return;
    }

    const previousDispose = creatorSurveyDisposers.get(options.area);
    previousDispose?.();

    const dispose = bindDataListsToSurvey(options.survey, deps);
    creatorSurveyDisposers.set(options.area, dispose);
  };

  creator.onAfterPropertyChanged.add(onDataListChanged);
  creator.onSurveyInstanceCreated.add(handleSurveyInstanceCreated);

  const disposeConvertTitleActions = bindConvertInlineChoicesTitleActions(creator);

  if (creator.survey) {
    const initialSurveyArea = "__creator-initial-survey";
    const previousDispose = creatorSurveyDisposers.get(initialSurveyArea);
    previousDispose?.();

    const dispose = bindDataListsToSurvey(creator.survey, deps);
    creatorSurveyDisposers.set(initialSurveyArea, dispose);
  }

  return () => {
    disposeConvertTitleActions();
    creator.onAfterPropertyChanged.remove(onDataListChanged);
    creator.onSurveyInstanceCreated.remove(handleSurveyInstanceCreated);
    creatorSurveyDisposers.forEach((dispose) => dispose?.());
    creatorSurveyDisposers.clear();
    creatorWithFlags[DATA_LIST_CREATOR_BOUND_KEY] = false;
  };
}
