import type {
  SubmissionGridAnswerFilterCoverage,
  SubmissionGridReadiness,
} from "@/lib/endatix-api/reporting/submission-grid-types";
import { formatInteger } from "@/lib/utils/formatters";

export type UnpreparedCounts = {
  completed: number;
  inProgress: number;
  preparing: number;
};

export type GridReadinessBanner = {
  title: string;
  lines: string[];
  showPrepare: boolean;
  showIncludeInProgress: boolean;
};

export type DescribeGridReadinessInput = {
  schemaReady: boolean;
  readiness: SubmissionGridReadiness;
  /** May export or edit: the API's rule for preparing, so **Prepare** and **Include in-progress** show. */
  canPrepare: boolean;
  hasAnswerFilters?: boolean;
  answerFiltersWaiting?: boolean;
};

/**
 * Splits the submissions that are not prepared into completed and in
 * progress. The counts do not say which prepared rows are complete, so
 * prepared rows are taken as completed first: in-progress rows are prepared
 * only on request. Rows being prepared are counted once, as `preparing`.
 */
export function countUnprepared({
  completedSubmissions: completed,
  inProgress,
  prepared,
  pending,
}: SubmissionGridReadiness): UnpreparedCounts {
  const preparedInProgress = atLeastZero(prepared - completed);
  return {
    completed: atLeastZero(completed - prepared - pending),
    inProgress: atLeastZero(inProgress - preparedInProgress),
    preparing: pending,
  };
}

function atLeastZero(count: number): number {
  return Math.max(0, count);
}

const ANSWER_FILTERS_NOT_APPLIED_LINE =
  "The answer filters in this link are not applied until the form is prepared.";

const ANSWER_FILTERS_WAITING_LINE =
  "Answer filters on columns that are not filterable or still being prepared are not applied.";

const NO_SCHEMA_BANNER: GridReadinessBanner = {
  title: "This form's reporting data is not prepared",
  lines: [
    "Answers show from each submission as entered. Prepare the form to read them from reporting data and to filter by them.",
  ],
  showPrepare: true,
  showIncludeInProgress: false,
};

/** The grid's readiness banner, or null when there is nothing to say; its buttons show only with `canPrepare`. */
export function describeGridReadiness(
  input: DescribeGridReadinessInput,
): GridReadinessBanner | null {
  if (input.readiness.submissions === 0) {
    return null;
  }

  const banner = describeReadiness(input);
  return withPrepareAccess(
    input.answerFiltersWaiting ? withFiltersWaiting(banner) : banner,
    input.canPrepare,
  );
}

/** The counts show to everyone; the buttons only to users the API lets prepare. */
function withPrepareAccess(
  banner: GridReadinessBanner | null,
  canPrepare: boolean,
): GridReadinessBanner | null {
  if (!banner || canPrepare) {
    return banner;
  }

  return { ...banner, showPrepare: false, showIncludeInProgress: false };
}

/** Without a schema, the not-prepared banner; with answer filters on a prepared form, none; otherwise the unprepared counts. */
function describeReadiness({
  schemaReady,
  readiness,
  hasAnswerFilters,
}: DescribeGridReadinessInput): GridReadinessBanner | null {
  if (!schemaReady) {
    return hasAnswerFilters ? withFiltersNotApplied() : NO_SCHEMA_BANNER;
  }

  return hasAnswerFilters
    ? null
    : describeUnprepared(countUnprepared(readiness));
}

function withFiltersWaiting(
  banner: GridReadinessBanner | null,
): GridReadinessBanner {
  return banner
    ? { ...banner, lines: [...banner.lines, ANSWER_FILTERS_WAITING_LINE] }
    : {
        title: "Some answer filters are not applied yet",
        lines: [ANSWER_FILTERS_WAITING_LINE],
        showPrepare: false,
        showIncludeInProgress: false,
      };
}

function withFiltersNotApplied(): GridReadinessBanner {
  return {
    ...NO_SCHEMA_BANNER,
    lines: [...NO_SCHEMA_BANNER.lines, ANSWER_FILTERS_NOT_APPLIED_LINE],
  };
}

/** Counts completed and in-progress submissions that are not prepared; null when every submission is. */
function describeUnprepared(
  counts: UnpreparedCounts,
): GridReadinessBanner | null {
  const lines = unpreparedLines(counts);
  if (lines.length === 0) {
    return null;
  }

  return {
    title: "Some submissions are not prepared",
    lines,
    showPrepare: counts.completed > 0,
    showIncludeInProgress: counts.inProgress > 0,
  };
}

export type DescribeRowsBannerInput = {
  coverage?: SubmissionGridAnswerFilterCoverage;
  answerFiltersNotPrepared?: boolean;
  canPrepare: boolean;
};

const ANSWER_FILTERS_NOT_PREPARED_BANNER: GridReadinessBanner = {
  title: "Answer filters are off",
  lines: [
    "This form's reporting data is not prepared, so the rows below are not filtered by answers. Prepare the form to filter by them.",
  ],
  showPrepare: true,
  showIncludeInProgress: false,
};

/** The banner above filtered rows: answer filters off without a schema, or the submissions the filters could not check; buttons only with `canPrepare`. */
export function describeRowsBanner({
  coverage,
  answerFiltersNotPrepared,
  canPrepare,
}: DescribeRowsBannerInput): GridReadinessBanner | null {
  if (answerFiltersNotPrepared) {
    return withPrepareAccess(ANSWER_FILTERS_NOT_PREPARED_BANNER, canPrepare);
  }

  return coverage
    ? withPrepareAccess(describeUnchecked(coverage), canPrepare)
    : null;
}

/** Counts the submissions the answer filters did not check; null when they checked every one. */
function describeUnchecked(
  coverage: SubmissionGridAnswerFilterCoverage,
): GridReadinessBanner | null {
  const lines = uncheckedLines(coverage);
  if (lines.length === 0) {
    return null;
  }

  return {
    title: "Some submissions were not checked",
    lines,
    showPrepare: coverage.uncheckedCompleted > 0,
    showIncludeInProgress: coverage.uncheckedInProgress > 0,
  };
}

function uncheckedLines({
  uncheckedCompleted: completed,
  uncheckedInProgress: inProgress,
}: SubmissionGridAnswerFilterCoverage): string[] {
  return [
    completed > 0 &&
      `${submissions(completed)} completed ${verb(completed)} not prepared, ${notChecked(completed)}`,
    inProgress > 0 &&
      `${submissions(inProgress)} in progress ${verb(inProgress)} not included, ${notChecked(inProgress)}`,
  ].filter((line): line is string => typeof line === "string");
}

function notChecked(count: number): string {
  return `so the answer filters did not check ${count === 1 ? "it" : "them"}.`;
}

function unpreparedLines({
  completed,
  inProgress,
  preparing,
}: UnpreparedCounts): string[] {
  return [
    completed > 0 &&
      `${submissions(completed)} completed ${verb(completed)} not prepared.`,
    inProgress > 0 &&
      `${submissions(inProgress)} in progress ${verb(inProgress)} not included.`,
    preparing > 0 &&
      `${submissions(preparing)} ${verb(preparing)} being prepared.`,
  ].filter((line): line is string => typeof line === "string");
}

function submissions(count: number): string {
  return `${formatInteger(count)} ${count === 1 ? "submission" : "submissions"}`;
}

function verb(count: number): string {
  return count === 1 ? "is" : "are";
}
