import type { Submission } from "../submissions/types";
import type { SubmissionGridRow } from "./submission-grid-types";

/**
 * Stand-in for `GET forms/{formId}/reporting/submissions` until that endpoint
 * ships: a row built from `GET forms/{formId}/submissions`, the way the
 * endpoint builds rows that are not prepared. Answers come from the raw
 * `jsonData`, so only keys that equal a question name are found; the rest are
 * left out.
 */
export function toSubmissionGridRow(
  submission: Submission,
  columns: readonly string[],
): SubmissionGridRow {
  return {
    ...rowFacts(submission),
    ...rowDates(submission),
    rowState: "none",
    answers: pickAnswers(submission.jsonData, columns),
    answersSource: "raw",
  };
}

function rowFacts(submission: Submission) {
  return {
    id: submission.id,
    formId: submission.formId,
    formDefinitionId: submission.formDefinitionId,
    isComplete: submission.isComplete,
    collectionStatus: submission.collectionStatus,
    status: submission.status,
    isTestSubmission: submission.isTestSubmission,
    submitterId: submission.submitterId,
    submitterDisplayId: submission.submitterDisplayId,
    submitterProfile: submission.submitterProfile,
  };
}

function rowDates(submission: Submission) {
  return {
    createdAt: toWireDate(submission.createdAt) ?? "",
    modifiedAt: toWireDate(submission.modifiedAt),
    startedAt: toWireDate(submission.startedAt),
    completedAt: toWireDate(submission.completedAt),
  };
}

function pickAnswers(
  jsonData: string | undefined,
  columns: readonly string[],
): Record<string, unknown> {
  const data = parseAnswers(jsonData);
  return Object.fromEntries(
    columns
      .filter((key) => Object.hasOwn(data, key))
      .map((key) => [key, data[key]]),
  );
}

function parseAnswers(jsonData: string | undefined): Record<string, unknown> {
  if (!jsonData) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(jsonData);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The list types its dates as `Date`, but JSON carries ISO strings. */
function toWireDate(value: Date | string | undefined): string | undefined {
  return value instanceof Date ? value.toISOString() : value;
}
