import type { SubmissionGridReadiness } from "@/lib/endatix-api/reporting/submission-grid-types";
import { formatInteger } from "@/lib/utils/formatters";

/** Submissions whose answers the grid reads raw because they are not prepared. */
export type UnpreparedCounts = {
  completed: number;
  inProgress: number;
  preparing: number;
};

/** What the readiness banner says and offers; `null` hides it. */
export type GridReadinessBanner = {
  title: string;
  lines: string[];
  showPrepare: boolean;
  showIncludeInProgress: boolean;
};

export type DescribeGridReadinessInput = {
  schemaReady: boolean;
  readiness: SubmissionGridReadiness;
  /** Including in-progress submissions needs `forms.edit`. */
  canIncludeInProgress: boolean;
};

/**
 * Splits the submissions that are not prepared into completed and in
 * progress. The counts do not say which prepared rows are complete, so
 * prepared rows are taken as completed first: in-progress rows are prepared
 * only on request. The two counts always add up to the unprepared total.
 */
export function countUnprepared(
  readiness: SubmissionGridReadiness,
): UnpreparedCounts {
  const inProgress = Math.max(
    0,
    readiness.submissions - readiness.completedSubmissions,
  );
  const preparedInProgress = Math.max(
    0,
    readiness.prepared - readiness.completedSubmissions,
  );

  return {
    completed: Math.max(0, readiness.completedSubmissions - readiness.prepared),
    inProgress: Math.max(0, inProgress - preparedInProgress),
    preparing: readiness.pending,
  };
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
