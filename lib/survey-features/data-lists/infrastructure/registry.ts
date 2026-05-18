import { Serializer } from "survey-core";
import {
  DATA_LIST_PROPERTY_NAME,
  DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE,
} from "../constants";
import { DATA_LIST_QUESTION_TYPES } from "./data-list-survey-integration";

let isDataListRegistryInitialized = false;

/**
 * Registers creator-visible Data List metadata properties.
 * Must run before SurveyCreator initializes JSON metadata.
 */
export function registerDataListGlobals(): void {
  if (isDataListRegistryInitialized) {
    return;
  }

  const dataListProperty = {
    name: `${DATA_LIST_PROPERTY_NAME}:dropdown`,
    displayName: "Data list",
    category: "choices",
    visibleIndex: 0,
    dependsOn: "choicesFromQuestion",
    visibleIf: (obj: { choicesFromQuestion?: unknown }) => {
      return !obj.choicesFromQuestion;
    },
    choices: [],
  };

  for (const questionType of DATA_LIST_QUESTION_TYPES) {
    Serializer.addProperty(questionType, dataListProperty);

    const lazyLoadPageSize = Serializer.findProperty(
      questionType,
      "choicesLazyLoadPageSize",
    );
    if (lazyLoadPageSize) {
      lazyLoadPageSize.defaultValue = DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE;
    }
  }

  isDataListRegistryInitialized = true;
}
