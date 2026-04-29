import { Serializer } from "survey-core";
import {
  DATA_LIST_PROPERTY_NAME,
  DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE,
} from "../constants";

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
    visibleIf: (obj: any) => {
      return !obj.choicesFromQuestion;
    },
    choices: [],
  };

  Serializer.addProperty("dropdown", dataListProperty);
  Serializer.addProperty("tagbox", dataListProperty);

  // Reduce JSON churn by keeping default page size at serializer level.
  const dropdownLazyLoadPageSize = Serializer.findProperty(
    "dropdown",
    "choicesLazyLoadPageSize",
  );
  if (dropdownLazyLoadPageSize) {
    dropdownLazyLoadPageSize.defaultValue = DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE;
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
