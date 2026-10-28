import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import { LOCAL_DATE_TIME_FUNCTION } from "@/lib/survey-features/local-date-time";

/** A question shape the API lists on `prefillTargets`, or the question being edited. */
export type PrefillShape = {
  type: string;
  inputType?: string;
};

/** One Property as the variables definition describes it, including its `prefillTargets`. */
export type PrefillSource = PrefillShape & {
  variable: string;
  title: string;
  prefillTargets?: PrefillShape[];
};

const VARIABLE = "[A-Za-z0-9_]+";
const PLAIN_PREFILL = new RegExp(String.raw`^\{(${VARIABLE})\}$`);
const LOCAL_PREFILL = new RegExp(
  String.raw`^${LOCAL_DATE_TIME_FUNCTION}\(\{(${VARIABLE})\}\)$`,
);

const sourceCache = new WeakMap<object, PrefillSource[]>();

/** Omitted, blank, and SurveyJS's default `text` are the same plain text input. */
function plainInput(inputType: string | undefined): string {
  if (inputType === undefined || inputType === "" || inputType === "text") {
    return "text";
  }
  return inputType;
}

function sameShape(question: PrefillShape, target: PrefillShape): boolean {
  return (
    question.type === target.type &&
    plainInput(question.inputType) === plainInput(target.inputType)
  );
}

/** A question fits a Property when its type and input type equal one `prefillTargets` entry. */
export function isPrefillCompatible(
  question: PrefillShape,
  targets: readonly PrefillShape[],
): boolean {
  return targets.some((target) => sameShape(question, target));
}

/**
 * `{age}` and `edxLocalDateTime({renews_at})` name a Property. A calculation, another function,
 * or any extra text does not.
 */
export function prefillVariableOf(
  expression: string | undefined,
): string | undefined {
  if (!expression) return undefined;
  return (
    PLAIN_PREFILL.exec(expression)?.[1] ?? LOCAL_PREFILL.exec(expression)?.[1]
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function shapeOf(value: unknown): PrefillShape | undefined {
  if (!isRecord(value) || typeof value.type !== "string") return undefined;
  const inputType =
    typeof value.inputType === "string" ? value.inputType : undefined;
  return { type: value.type, inputType };
}

function collectPrefillSources(variables: AudienceVariables): PrefillSource[] {
  const elements = variables.variablePresets?.definition?.["elements"];
  if (!Array.isArray(elements)) return [];
  const sources: PrefillSource[] = [];
  for (const element of elements) {
    const shape = shapeOf(element);
    if (!isRecord(element) || !shape || typeof element.name !== "string") {
      continue;
    }
    const title =
      typeof element.title === "string" && element.title.trim()
        ? element.title
        : element.name;
    const targets = Array.isArray(element.prefillTargets)
      ? element.prefillTargets.flatMap((target) => {
          const parsed = shapeOf(target);
          return parsed ? [parsed] : [];
        })
      : undefined;
    sources.push({
      ...shape,
      variable: element.name,
      title,
      prefillTargets: targets,
    });
  }
  return sources;
}

/** Properties from the variables definition. The same variables object is read once. */
export function prefillSources(variables: AudienceVariables): PrefillSource[] {
  const cached = sourceCache.get(variables);
  if (cached) return cached;
  const sources = collectPrefillSources(variables);
  sourceCache.set(variables, sources);
  return sources;
}
