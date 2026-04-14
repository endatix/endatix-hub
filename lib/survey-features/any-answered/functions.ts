import { SurveyModel } from "survey-core";

interface FunctionContext {
  survey?: SurveyModel;
}

function isSurveyValueEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
}

function hasAnsweredValue(
  questionName: string,
  values: Record<string, unknown>,
): boolean {
  return !isSurveyValueEmpty(values[questionName]);
}

function getValues(properties: unknown): Record<string, unknown> {
  if (!properties || typeof properties !== "object") {
    return {};
  }

  return properties as Record<string, unknown>;
}

export function anyAnsweredFunction(
  this: FunctionContext,
  params: unknown[],
  properties: unknown,
): boolean {
  const context = this as FunctionContext | undefined;
  const values = context?.survey?.data ?? getValues(properties);
  const questionNames = params.filter(
    (param): param is string => typeof param === "string" && param.length > 0,
  );

  if (questionNames.length === 0) {
    return false;
  }

  return questionNames.some((questionName) => hasAnsweredValue(questionName, values));
}

export function anyAnsweredByPrefixFunction(
  this: FunctionContext,
  params: unknown[],
  properties: unknown,
): boolean {
  const context = this as FunctionContext | undefined;
  const values = context?.survey?.data ?? getValues(properties);
  const [prefixParam] = params;
  if (typeof prefixParam !== "string" || prefixParam.length === 0) {
    return false;
  }

  return Object.keys(values)
    .filter((questionName) => questionName.startsWith(prefixParam))
    .some((questionName) => hasAnsweredValue(questionName, values));
}
