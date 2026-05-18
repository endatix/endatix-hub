import type { Model, Question } from "survey-core";
import { QuestionSelectBase } from "survey-core";
import { DATA_LIST_PROPERTY_NAME } from "../constants";

/** Question types that support the data-list custom property (Serializer registration). */
export const DATA_LIST_QUESTION_TYPES: readonly string[] = [
  "dropdown",
  "tagbox",
] as const;

export type DataListQuestionType = (typeof DATA_LIST_QUESTION_TYPES)[number];

/** Checks if a question type is a data-list question type. */
export function isDataListQuestionType(
  type: string,
): type is DataListQuestionType {
  return DATA_LIST_QUESTION_TYPES.includes(type);
}

/** Normalizes a stored data-list id from property values or creator events. */
export function parseDataListId(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

/** Reads the bound data-list id from a Survey choice question, if any. */
export function getDataListIdFromQuestion(question: Question): string | null {
  if (!question || !isDataListQuestionType(question.getType())) {
    return null;
  }

  return parseDataListId(question.getPropertyValue(DATA_LIST_PROPERTY_NAME));
}

/** Checks if a question is a data-list question. */
export function isDataListQuestion(question: Question): boolean {
  return getDataListIdFromQuestion(question) !== null;
}

/** Gets stored answer value(s) from a data-list choice question. */
export function getDataListAnswerValues(question: Question): unknown[] {
  const raw = question.value;
  if (raw === null || raw === undefined || raw === "") {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw;
  }
  return [raw];
}
