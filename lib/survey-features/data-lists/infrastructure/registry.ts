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
    dependsOn: ["choicesFromQuestion", "advancedCarryForwardEnabled"],
    visibleIf: (obj: {
      choicesFromQuestion?: unknown;
      advancedCarryForwardEnabled?: boolean;
    }) => {
      return !obj.choicesFromQuestion && !obj.advancedCarryForwardEnabled;
    },
    choices: [],
  };

  for (const questionType of DATA_LIST_QUESTION_TYPES) {
    Serializer.addProperty(questionType, dataListProperty);

    // SurveyJS validates dropdown-type properties against the current `choices` array.
    // Choices come from the Hub API and may not yet include every ID present in JSON
    // (e.g. after bulk conversion before refetch, or API paging). Those IDs are still valid.
    for (const className of ["dropdown", "tagbox"] as const) {
      const prop = Serializer.findProperty(
        className,
        DATA_LIST_PROPERTY_NAME,
      ) as { validateValue?: (obj: unknown, value: unknown) => boolean } | null;
      if (prop) {
        prop.validateValue = () => true;
      }
    }

    // Legacy: remove standalone property-row UI (replaced by Choices toolbar action).
    try {
      Serializer.removeProperty("dropdown", "edxConvertInlineChoices");
      Serializer.removeProperty("tagbox", "edxConvertInlineChoices");
    } catch {
      /* property may not exist */
    }

    // Reduce JSON churn by keeping default page size at serializer level.
    const dropdownLazyLoadPageSize = Serializer.findProperty(
      "dropdown",
      "choicesLazyLoadPageSize",
    );
    if (dropdownLazyLoadPageSize) {
      dropdownLazyLoadPageSize.defaultValue =
        DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE;
    }

    const tagboxLazyLoadPageSize = Serializer.findProperty(
      "tagbox",
      "choicesLazyLoadPageSize",
    );
    if (tagboxLazyLoadPageSize) {
      tagboxLazyLoadPageSize.defaultValue = DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE;
    }

    isDataListRegistryInitialized = true;
  }
}
