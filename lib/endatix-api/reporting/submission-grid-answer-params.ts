import { MAX_SUBMISSION_GRID_COLUMNS_PARAM_BYTES } from "./submission-grid-row-columns";
import {
  MAX_SUBMISSION_GRID_ANSWER_FILTERS,
  type SubmissionGridAnswerFilter,
} from "./submission-grid-types";

/**
 * Bytes the encoded `answer=` params may take. They share the request line
 * with `columns=`, which gives up what they use, so the two together stay
 * within {@link MAX_SUBMISSION_GRID_COLUMNS_PARAM_BYTES}.
 */
export const MAX_SUBMISSION_GRID_ANSWER_PARAMS_BYTES = 2_048;

/**
 * `{operator}:{key}:{value}`. A schema key can hold `:`, so the key is
 * percent-encoded here, and `URLSearchParams` encodes the whole value again
 * on the wire; the API decodes the query once and then the key. The value
 * is everything after the second `:`.
 */
export function toAnswerParam({
  operator,
  key,
  value,
}: SubmissionGridAnswerFilter): string {
  return `${operator}:${encodeURIComponent(key)}:${value}`;
}

export function answerParamsBytes(
  filters: readonly SubmissionGridAnswerFilter[],
): number {
  const params = new URLSearchParams();
  filters.forEach((filter) => params.append("answer", toAnswerParam(filter)));
  return params.toString().length;
}

export function fitAnswerFilters(
  filters: readonly SubmissionGridAnswerFilter[],
): SubmissionGridAnswerFilter[] {
  const fitted: SubmissionGridAnswerFilter[] = [];
  for (const filter of filters.slice(0, MAX_SUBMISSION_GRID_ANSWER_FILTERS)) {
    const next = [...fitted, filter];
    if (answerParamsBytes(next) > MAX_SUBMISSION_GRID_ANSWER_PARAMS_BYTES) {
      break;
    }
    fitted.push(filter);
  }
  return fitted;
}
