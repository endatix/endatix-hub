import { DataListSummary } from "@/lib/endatix-api/data-lists/types";
import { Serializer } from "survey-core";
import {
  AfterPropertyChangedEvent,
  SurveyCreatorModel,
  SurveyInstanceCreatedEvent,
} from "survey-creator-core";
import { DATA_LIST_PROPERTY_NAME } from "../constants";
import { bindDataListsToSurvey } from "./survey-bindings";
import { FormRuntimeState } from "@/lib/form-runtime/form-runtime.context";
import { registerDataListGlobals } from "./registry";

const DATA_LIST_CREATOR_BOUND_KEY = "__endatixDataListsCreatorBound";

function toDataListId(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

export function setDataListPropertyChoices(dataLists: DataListSummary[]): void {
  registerDataListGlobals();
  const choices = dataLists.map((item) => ({
    value: String(item.id),
    text: item.name,
  }));

  const dropdownProperty = Serializer.findProperty(
    "dropdown",
    DATA_LIST_PROPERTY_NAME,
  );
  dropdownProperty?.setChoices(choices);

  const tagboxProperty = Serializer.findProperty(
    "tagbox",
    DATA_LIST_PROPERTY_NAME,
  );
  tagboxProperty?.setChoices(choices);
}

export function bindDataListsToCreator(
  creator: SurveyCreatorModel,
  getRuntimeState: () => FormRuntimeState,
): () => void {
  registerDataListGlobals();
  const creatorWithFlags = creator as SurveyCreatorModel &
    Record<string, unknown>;
  if (creatorWithFlags[DATA_LIST_CREATOR_BOUND_KEY]) {
    return () => {};
  }
  creatorWithFlags[DATA_LIST_CREATOR_BOUND_KEY] = true;

  const creatorSurveyDisposers: Array<() => void> = [];

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

    const dataListId = toDataListId(options.value);
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

    const dispose = bindDataListsToSurvey(options.survey, getRuntimeState);
    creatorSurveyDisposers.push(dispose);
  };

  creator.onAfterPropertyChanged.add(onDataListChanged);
  creator.onSurveyInstanceCreated.add(handleSurveyInstanceCreated);

  if (creator.survey) {
    const dispose = bindDataListsToSurvey(creator.survey, getRuntimeState);
    creatorSurveyDisposers.push(dispose);
  }

  return () => {
    creator.onAfterPropertyChanged.remove(onDataListChanged);
    creator.onSurveyInstanceCreated.remove(handleSurveyInstanceCreated);
    creatorSurveyDisposers.forEach((dispose) => dispose?.());
    creatorWithFlags[DATA_LIST_CREATOR_BOUND_KEY] = false;
  };
}
