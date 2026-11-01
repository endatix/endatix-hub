import type { SubmissionGridReadiness } from "@/lib/endatix-api/reporting/submission-grid-types";
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
  canIncludeInProgress: boolean;
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

const NO_SCHEMA_BANNER: GridReadinessBanner = {
  title: "This form's reporting data is not prepared",
  lines: [
    "Answers show from each submission as entered. Prepare the form to read them from reporting data.",
  ],
  showPrepare: true,
  showIncludeInProgress: false,
};

export function describeGridReadiness({
  schemaReady,
  readiness,
  canIncludeInProgress,
}: DescribeGridReadinessInput): GridReadinessBanner | null {
  if (readiness.submissions === 0) {
    return null;
  }

  if (!schemaReady) {
    return NO_SCHEMA_BANNER;
  }

  return describeUnprepared(countUnprepared(readiness), canIncludeInProgress);
}

function describeUnprepared(
  counts: UnpreparedCounts,
  canIncludeInProgress: boolean,
): GridReadinessBanner | null {
  const lines = unpreparedLines(counts);
  if (lines.length === 0) {
    return null;
  }

  return {
    title: "Some submissions are not prepared",
    lines,
    showPrepare: counts.completed > 0,
    showIncludeInProgress: counts.inProgress > 0 && canIncludeInProgress,
  };
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
