import type { IQuestion, Question } from "survey-core";
import { isSelectBaseQuestion, normalizeChoiceKey } from "@/lib/utils/survey";
import { CARRY_FORWARD_SOURCES_PROPERTY } from "@/lib/survey-features/carry-forward/constants";
import { isChoicesFromQuestionConfigured } from "@/lib/survey-features/carry-forward/types";
import { isAdvancedCarryForwardRuntimeEnabled } from "@/lib/survey-features/infrastructure/choice-source-mutual-exclusion";
import { getDataListIdFromQuestion } from "../infrastructure/data-list-survey-integration";
import type { PropertyGridChoice } from "../types";

type QuestionLookup = {
  findQuestionByName?: (name: string) => IQuestion | null | undefined;
};

export function formatSourceChoiceLabel(
  sourceName: string,
  value: string,
  text: string,
): string {
  return `${sourceName}: (${text || value})`;
}

/** Finds a question named by `question`, in its own scope first, as SurveyJS does for `choicesFromQuestion`. */
function findReferencedQuestion(
  question: Question,
  name: string,
): Question | null {
  const data = (question as Question & { data?: QuestionLookup }).data;
  const found =
    data?.findQuestionByName?.(name) ??
    question.survey?.getQuestionByName(name);
  return (found as Question | null | undefined) ?? null;
}

/** The questions `question` takes its choices from, or `null` when it owns them. */
function getUpstreamNames(question: Question): string[] | null {
  if (getDataListIdFromQuestion(question)) {
    return null;
  }

  const copy = question as Question & { choicesFromQuestion?: string };
  if (isChoicesFromQuestionConfigured(copy)) {
    return [copy.choicesFromQuestion!];
  }

  if (isAdvancedCarryForwardRuntimeEnabled(question)) {
    const sources = question.getPropertyValue(CARRY_FORWARD_SOURCES_PROPERTY);
    return Array.isArray(sources)
      ? sources.filter((name): name is string => typeof name === "string")
      : [];
  }

  return null;
}

/**
 * Follows a source through `choicesFromQuestion` and carry forward to the
 * questions that own its choices in the designer, where neither fills the
 * source's own `choices`. A cycle resolves to nothing. This is the design-time
 * superset: carry-forward mode and max choices narrow it only at runtime.
 */
function resolveChoiceOwners(
  source: Question,
  visited: Set<Question> = new Set(),
): Question[] {
  if (visited.has(source)) {
    return [];
  }
  visited.add(source);

  const upstreamNames = getUpstreamNames(source);
  if (!upstreamNames) {
    return [source];
  }

  return upstreamNames.flatMap((name) =>
    resolveUpstreamOwners(source, name, visited),
  );
}

function resolveUpstreamOwners(
  source: Question,
  name: string,
  visited: Set<Question>,
): Question[] {
  const upstream = findReferencedQuestion(source, name);
  return upstream && isSelectBaseQuestion(upstream)
    ? resolveChoiceOwners(upstream, visited)
    : [];
}

/** The static choices a source offers, from the questions that own them. */
function getOwnedChoices(source: Question): Question["choices"] {
  return resolveChoiceOwners(source)
    .filter((owner) => !getDataListIdFromQuestion(owner))
    .flatMap((owner) => owner.choices ?? []);
}

export function hasDataListSource(sources: Question[]): boolean {
  return sources.some((source) =>
    resolveChoiceOwners(source).some(
      (owner) => getDataListIdFromQuestion(owner) !== null,
    ),
  );
}

function matchesFilter(
  normalizedFilter: string,
  value: string,
  text: string,
): boolean {
  return (
    !normalizedFilter ||
    text.toLowerCase().includes(normalizedFilter) ||
    value.toLowerCase().includes(normalizedFilter)
  );
}

/**
 * Static choices of each source, labelled with the source's name, with the
 * values of the question that owns them.
 */
export function getStaticChoicesFromSources(
  sources: Question[],
  filter: string,
  formatLabel: (
    sourceName: string,
    value: string,
    text: string,
  ) => string = formatSourceChoiceLabel,
): PropertyGridChoice[] {
  const normalizedFilter = filter.trim().toLowerCase();
  const seen = new Set<string>();
  const items: PropertyGridChoice[] = [];

  for (const source of sources) {
    for (const choice of getOwnedChoices(source)) {
      const value = normalizeChoiceKey(choice.value);
      if (!value || seen.has(value)) {
        continue;
      }

      const text = formatLabel(
        source.name,
        value,
        String(choice.text ?? choice.value),
      );

      if (!matchesFilter(normalizedFilter, value, text)) {
        continue;
      }

      seen.add(value);
      items.push({ value, text });
    }
  }

  return items;
}

function getOwnedDataListIds(source: Question): string[] {
  return resolveChoiceOwners(source).flatMap((owner) => {
    const dataListId = getDataListIdFromQuestion(owner);
    return dataListId ? [dataListId] : [];
  });
}

/**
 * The data lists the sources reach, each once, under the first source that
 * reaches it, so the lazy picker fetches and counts a list only once.
 */
export function getDataListSourceRefs(
  sources: Question[],
): Array<{ sourceName: string; dataListId: string }> {
  const seen = new Set<string>();
  const isFirstReach = (dataListId: string) =>
    !seen.has(dataListId) && Boolean(seen.add(dataListId));

  return sources.flatMap((source) =>
    getOwnedDataListIds(source)
      .filter((dataListId) => isFirstReach(dataListId))
      .map((dataListId) => ({ sourceName: source.name, dataListId })),
  );
}
