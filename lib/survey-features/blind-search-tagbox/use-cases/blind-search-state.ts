import type { ItemValue, Question } from "survey-core";
import {
  BLIND_SEARCH_TAGBOX_TYPE,
  DEFAULT_MIN_SEARCH_LENGTH,
} from "../constants";
import type { BlindSearchTagboxQuestion } from "../types";

export function isBlindSearchTagboxQuestion(
  question: Question,
): question is BlindSearchTagboxQuestion {
  return !!question && question.getType() === BLIND_SEARCH_TAGBOX_TYPE;
}

export function isBlindSearchEnabled(
  question: Question,
): question is BlindSearchTagboxQuestion {
  if (!isBlindSearchTagboxQuestion(question)) {
    return false;
  }

  return question.edxHideUntilTyping === true;
}

export function usesLazyLoadedChoices(question: Question): boolean {
  if (!isBlindSearchTagboxQuestion(question)) {
    return false;
  }

  return question.choicesLazyLoadEnabled === true;
}

export function getMinSearchLength(question: BlindSearchTagboxQuestion): number {
  const configuredLength = question.edxMinSearchLength;
  if (
    typeof configuredLength === "number" &&
    Number.isFinite(configuredLength) &&
    configuredLength >= 0
  ) {
    return configuredLength;
  }

  return DEFAULT_MIN_SEARCH_LENGTH;
}

export function isSearchThresholdMet(
  filter: string,
  minSearchLength: number,
): boolean {
  return filter.trim().length >= minSearchLength;
}

export function shouldSuppressChoices(
  question: Question,
  filter: string,
): boolean {
  if (!isBlindSearchEnabled(question)) {
    return false;
  }

  const minSearchLength = getMinSearchLength(question);
  return !isSearchThresholdMet(filter, minSearchLength);
}

function getChoiceDisplayText(choice: ItemValue): string {
  return choice.text || String(choice.value ?? "");
}

export function filterChoicesBySearch(
  question: BlindSearchTagboxQuestion,
  choices: ItemValue[],
  filter: string,
): ItemValue[] {
  const normalizedFilter = filter.trim().toLowerCase();
  if (!normalizedFilter) {
    return choices;
  }

  const searchMode = question.searchMode ?? "contains";

  return choices.filter((choice) => {
    const text = getChoiceDisplayText(choice).toLowerCase();
    if (searchMode === "startsWith") {
      return text.startsWith(normalizedFilter);
    }

    return text.includes(normalizedFilter);
  });
}

export function shouldEnableOtherFallback(
  question: Question,
  filter: string,
  visibleChoiceCount: number,
): boolean {
  if (!isBlindSearchEnabled(question)) {
    return false;
  }

  const minSearchLength = getMinSearchLength(question);
  if (!isSearchThresholdMet(filter, minSearchLength)) {
    return false;
  }

  return visibleChoiceCount === 0;
}

function isOtherAnswerValue(
  question: BlindSearchTagboxQuestion,
  entry: unknown,
): boolean {
  return entry === question.otherItem.value;
}

export function isOtherInQuestionValue(question: Question): boolean {
  if (!isBlindSearchTagboxQuestion(question)) {
    return false;
  }

  const value = question.value;
  if (Array.isArray(value)) {
    return value.some((entry) => isOtherAnswerValue(question, entry));
  }

  if (value === null || value === undefined || value === "") {
    return false;
  }

  return isOtherAnswerValue(question, value);
}
