import type { Question } from "survey-core";
import { DATA_LIST_PROPERTY_NAME } from "../constants";
import { parseScalarString } from "@/lib/utils/type-parsers";

function hasDynamicChoiceSourcesInRecord(
  source: Record<string, unknown>,
): boolean {
  const dataListId = source[DATA_LIST_PROPERTY_NAME];
  const parsedDataListId = parseScalarString(dataListId);
  if (parsedDataListId !== null && parsedDataListId.length > 0) {
    return true;
  }

  const choicesFromQuestion = source.choicesFromQuestion;
  if (
    choicesFromQuestion !== undefined &&
    choicesFromQuestion !== null &&
    typeof choicesFromQuestion === "string" &&
    choicesFromQuestion.trim().length > 0
  ) {
    return true;
  }

  const choicesByUrl = source.choicesByUrl;
  if (typeof choicesByUrl === "string" && choicesByUrl.trim().length > 0) {
    return true;
  }
  if (choicesByUrl && typeof choicesByUrl === "object") {
    const url = (choicesByUrl as { url?: unknown }).url;
    if (typeof url === "string" && url.trim().length > 0) {
      return true;
    }
  }

  return false;
}

function readQuestionProp(q: Question, name: string): unknown {
  const viaSerializer = q.getPropertyValue(name);
  if (viaSerializer !== undefined && viaSerializer !== null) {
    return viaSerializer;
  }
  const direct = (q as unknown as Record<string, unknown>)[name];
  if (direct !== undefined && direct !== null) {
    return direct;
  }
  const json = q.toJSON() as Record<string, unknown>;
  return json[name];
}

/**
 * Checks if a question JSON node has dynamic choice sources.
 */
export function hasDynamicChoiceSourcesInJson(
  element: Record<string, unknown>,
): boolean {
  return hasDynamicChoiceSourcesInRecord(element);
}

/**
 * Checks if a live Survey question has dynamic choice sources.
 */
export function hasDynamicChoiceSources(q: Question): boolean {
  return hasDynamicChoiceSourcesInRecord({
    [DATA_LIST_PROPERTY_NAME]: readQuestionProp(q, DATA_LIST_PROPERTY_NAME),
    choicesFromQuestion: readQuestionProp(q, "choicesFromQuestion"),
    choicesByUrl: readQuestionProp(q, "choicesByUrl"),
  });
}
function isScalarString(dataListId: unknown) {
  throw new Error("Function not implemented.");
}
