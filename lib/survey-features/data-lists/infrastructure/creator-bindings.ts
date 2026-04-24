import { DataListSummary } from "@/lib/endatix-api/data-lists/types";
import { Serializer } from "survey-core";
import {
  AfterPropertyChangedEvent,
  SurveyCreatorModel,
  SurveyInstanceCreatedEvent,
} from "survey-creator-core";
import {
  DATA_LIST_PROPERTY_NAME,
  RUNTIME_DATA_LIST_CONTEXT_KEY,
} from "../constants";
import { bindDataListsToSurvey } from "./survey-bindings";
import { DataListRuntimeContext } from "../runtime-context";
import { registerDataListGlobals } from "./registry";

const DATA_LIST_CREATOR_BOUND_KEY = "__endatixDataListsCreatorBound";

export function setDataListPropertyChoices(dataLists: DataListSummary[]): void {
  registerDataListGlobals();
  const choices = dataLists.map((item) => ({
    value: String(item.id),
    text: item.name,
  }));

  const dropdownProperty = Serializer.findProperty("dropdown", DATA_LIST_PROPERTY_NAME);
  dropdownProperty?.setChoices(choices);

  const tagboxProperty = Serializer.findProperty("tagbox", DATA_LIST_PROPERTY_NAME);
  tagboxProperty?.setChoices(choices);
}

export function bindDataListsToCreator(
  creator: SurveyCreatorModel,
): () => void {
  registerDataListGlobals();
  const creatorWithFlags = creator as SurveyCreatorModel &
    Record<string, unknown>;
  if (creatorWithFlags[DATA_LIST_CREATOR_BOUND_KEY]) {
    return () => {};
  }
  creatorWithFlags[DATA_LIST_CREATOR_BOUND_KEY] = true;
  const creatorRuntimeContext = creatorWithFlags[
    RUNTIME_DATA_LIST_CONTEXT_KEY
  ] as DataListRuntimeContext | undefined;

  const creatorSurveyDisposers: Array<() => void> = [];

  const attachRuntimeContext = (survey: unknown) => {
    if (!creatorRuntimeContext || !survey || typeof survey !== "object") {
      return;
    }

    (survey as Record<string, unknown>)[RUNTIME_DATA_LIST_CONTEXT_KEY] =
      creatorRuntimeContext;
  };

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

    const dataListId =
      typeof options.value === "string" && options.value.length > 0
        ? options.value
        : typeof options.value === "number" && Number.isFinite(options.value)
          ? String(options.value)
          : null;
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

    attachRuntimeContext(options.survey);
    const dispose = bindDataListsToSurvey(options.survey);
    creatorSurveyDisposers.push(dispose);
  };

  creator.onAfterPropertyChanged.add(onDataListChanged);
  creator.onSurveyInstanceCreated.add(handleSurveyInstanceCreated);

  if (creator.survey) {
    attachRuntimeContext(creator.survey);
    const dispose = bindDataListsToSurvey(creator.survey);
    creatorSurveyDisposers.push(dispose);
  }

  return () => {
    creator.onAfterPropertyChanged.remove(onDataListChanged);
    creator.onSurveyInstanceCreated.remove(handleSurveyInstanceCreated);
    creatorSurveyDisposers.forEach((dispose) => dispose?.());
    creatorWithFlags[DATA_LIST_CREATOR_BOUND_KEY] = false;
  };
}
