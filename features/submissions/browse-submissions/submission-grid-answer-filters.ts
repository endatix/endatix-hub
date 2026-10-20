import type { DateFilterValue } from "@/components/table/date-filter-types";
import { fitAnswerFilters } from "@/lib/endatix-api/reporting/submission-grid-answer-params";
import {
  MAX_SUBMISSION_GRID_CONTAINS_LENGTH,
  type SubmissionGridAnswerFilter,
  type SubmissionGridAnswerOperator,
  type SubmissionGridFilterType,
} from "@/lib/endatix-api/reporting/submission-grid-types";
import { parseCalendarDateYmd } from "@/lib/endatix-api/shared/list-query";
import { firstSearchParam, type SearchParam } from "@/lib/utils/next-utils";
import type { AnswerColumn } from "./submission-grid-columns";

const URL_KEY_PREFIX = "answer.";
const OPERATORS: ReadonlySet<string> = new Set<SubmissionGridAnswerOperator>([
  "contains",
  "from",
  "to",
]);
const CHOICE_QUESTION_TYPES: ReadonlySet<string> = new Set([
  "dropdown",
  "radiogroup",
]);

type AnswerFilterTarget = Omit<SubmissionGridAnswerFilter, "value">;

/**
 * The list URL key of one answer filter: `answer.{operator}.{key}`. The
 * operator is a closed set and the key is the whole rest, so a schema key
 * holding `.`, `:` or `~` reads back unchanged.
 */
export function answerFilterUrlKey(
  operator: SubmissionGridAnswerOperator,
  key: string,
): string {
  return `${URL_KEY_PREFIX}${operator}.${key}`;
}

/** The grid owns every `answer.` key, so a malformed one leaves the URL. */
export function isAnswerFilterUrlKey(name: string): boolean {
  return name.startsWith(URL_KEY_PREFIX);
}

/**
 * Every well-formed answer filter in the URL, in URL order. A `contains`
 * longer than the API accepts is cut to that length; a bound that is not a
 * real `yyyy-MM-dd` calendar day is dropped.
 */
export function parseAnswerFilters(
  raw: Record<string, SearchParam>,
): SubmissionGridAnswerFilter[] {
  return Object.entries(raw).flatMap(
    ([name, value]) => parseAnswerFilter(name, firstSearchParam(value)) ?? [],
  );
}

export function answerFilterUrlEntries(
  filters: readonly SubmissionGridAnswerFilter[],
): Array<readonly [string, string]> {
  return filters.map(
    ({ operator, key, value }) =>
      [answerFilterUrlKey(operator, key), value] as const,
  );
}

/**
 * The filters the form's columns can apply: keys with a fitting filter type,
 * up to the API's count and the request line's byte budget. The rest would
 * fail the whole request.
 */
export function applicableAnswerFilters(
  filters: readonly SubmissionGridAnswerFilter[],
  catalog: readonly AnswerColumn[],
): SubmissionGridAnswerFilter[] {
  const filterTypes = new Map(
    catalog.map((column) => [column.key, column.filterType]),
  );
  return fitAnswerFilters(
    filters.filter(({ operator, key }) =>
      operatorFits(operator, filterTypes.get(key)),
    ),
  );
}

/** URL keys of the `contains` filters, for the one debounced text writer. */
export function answerTextFilterUrlKeys(
  catalog: readonly AnswerColumn[],
): string[] {
  return catalog
    .filter((column) => column.filterType === "text")
    .map((column) => answerFilterUrlKey("contains", column.key));
}

/** A date column's From/To bounds, as its header filter takes them. */
export function answerDateFilter(
  filters: readonly SubmissionGridAnswerFilter[],
  key: string,
): DateFilterValue {
  const bound = (operator: SubmissionGridAnswerOperator) =>
    filters.find((filter) => filter.key === key && filter.operator === operator)
      ?.value;
  return { from: bound("from"), to: bound("to") };
}

/** Dropdown and radio answers are stored as the choice value, not its text. */
export function matchesStoredChoiceValue(column: AnswerColumn): boolean {
  return CHOICE_QUESTION_TYPES.has(column.questionType ?? "");
}

function parseAnswerFilter(
  name: string,
  rawValue: string | undefined,
): SubmissionGridAnswerFilter | undefined {
  const target = parseUrlKey(name);
  const value = target && normalizeValue(target.operator, rawValue?.trim());
  return target && value ? { ...target, value } : undefined;
}

function parseUrlKey(name: string): AnswerFilterTarget | undefined {
  if (!isAnswerFilterUrlKey(name)) {
    return undefined;
  }

  const rest = name.slice(URL_KEY_PREFIX.length);
  const separator = rest.indexOf(".");
  const operator = rest.slice(0, separator);
  const key = rest.slice(separator + 1);
  return separator > 0 && key && OPERATORS.has(operator)
    ? { operator: operator as SubmissionGridAnswerOperator, key }
    : undefined;
}

function normalizeValue(
  operator: SubmissionGridAnswerOperator,
  value: string | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }

  if (operator === "contains") {
    return value.slice(0, MAX_SUBMISSION_GRID_CONTAINS_LENGTH);
  }

  return parseCalendarDateYmd(value);
}

function operatorFits(
  operator: SubmissionGridAnswerOperator,
  filterType: SubmissionGridFilterType | null | undefined,
): boolean {
  return operator === "contains"
    ? filterType === "text"
    : filterType === "date" || filterType === "datetime";
}
