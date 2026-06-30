import { Serializer } from "survey-core";
import {
  BLIND_SEARCH_TAGBOX_TYPE,
  DEFAULT_MIN_SEARCH_LENGTH,
  EDX_HIDE_UNTIL_TYPING_PROPERTY,
  EDX_MIN_SEARCH_LENGTH_PROPERTY,
} from "../constants";

let isBlindSearchTagboxRegistryInitialized = false;

/**
 * Registers Creator-visible blind search metadata on tagbox questions.
 * Must run before SurveyCreator or SurveyModel initializes JSON metadata.
 */
export function registerBlindSearchTagboxGlobals(): void {
  if (isBlindSearchTagboxRegistryInitialized) {
    return;
  }

  Serializer.addProperty(BLIND_SEARCH_TAGBOX_TYPE, {
    name: EDX_HIDE_UNTIL_TYPING_PROPERTY,
    displayName: "Hide choices until user types",
    category: "choices",
    type: "boolean",
    default: false,
  });

  Serializer.addProperty(BLIND_SEARCH_TAGBOX_TYPE, {
    name: EDX_MIN_SEARCH_LENGTH_PROPERTY,
    displayName: "Minimum search length",
    category: "choices",
    type: "number",
    default: DEFAULT_MIN_SEARCH_LENGTH,
    minValue: 0,
    visibleIf: (question: { edxHideUntilTyping?: boolean }) =>
      question.edxHideUntilTyping === true,
  });

  isBlindSearchTagboxRegistryInitialized = true;
}

export function resetBlindSearchTagboxRegistryForTests(): void {
  isBlindSearchTagboxRegistryInitialized = false;
}
