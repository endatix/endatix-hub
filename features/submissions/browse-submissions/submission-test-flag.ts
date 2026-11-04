import type { DeleteTestSubmissionsResponse } from "@/lib/endatix-api/submissions/types";
import { Result, type Error as ResultError } from "@/lib/result";

/** What the user may do with test submissions on the grid. */
export type SubmissionTestAccess = {
  /** `forms.test`: Mark as test / Mark as real. */
  canMark: boolean;
  /** `forms.test` and `submissions.delete`: Delete test submissions. */
  canDeleteTests: boolean;
};

export const NO_SUBMISSION_TEST_ACCESS: SubmissionTestAccess = {
  canMark: false,
  canDeleteTests: false,
};

/** Deleting test submissions needs `submissions.delete` on top of `forms.test`. */
export function submissionTestAccess(granted: {
  formsTest: boolean;
  submissionsDelete: boolean;
}): SubmissionTestAccess {
  return {
    canMark: granted.formsTest,
    canDeleteTests: granted.formsTest && granted.submissionsDelete,
  };
}

export type TestMarkMenuItem = {
  label: "Mark as test" | "Mark as real";
  isTest: boolean;
};

/** The row's mark item flips the flag; hidden without `forms.test`. */
export function testMarkMenuItem(
  row: { isTestSubmission?: boolean },
  access: SubmissionTestAccess,
): TestMarkMenuItem | null {
  if (!access.canMark) return null;
  return row.isTestSubmission
    ? { label: "Mark as real", isTest: false }
    : { label: "Mark as test", isTest: true };
}

/** What to tell the user, and whether to read the rows again. */
export type TestFlagOutcome = {
  variant: "success" | "error";
  message: string;
  refresh: boolean;
};

export type TestMarkOutcome = TestFlagOutcome & {
  /** What to do about a refusal, shown under its message. */
  hint?: string;
  /** The real submission that blocks Mark as real, for a link to it. */
  existingSubmissionId?: string;
};

const SUBMISSION_EXISTS = "submission_exists";

export const SUBMISSION_EXISTS_HINT =
  "Mark the submitter's real submission as test first.";

export function testMarkOutcome(
  isTest: boolean,
  result: Result<void>,
): TestMarkOutcome {
  if (Result.isSuccess(result)) {
    const kind = isTest ? "test" : "real";
    return {
      variant: "success",
      message: `Marked as a ${kind} submission.`,
      refresh: true,
    };
  }
  return markFailure(result);
}

/** `submission_exists` names the real submission that blocks Mark as real. */
function markFailure(result: ResultError): TestMarkOutcome {
  const failure: TestMarkOutcome = {
    variant: "error",
    message: result.message,
    refresh: false,
  };
  const existing =
    result.errorCode === SUBMISSION_EXISTS ? result.existingId : undefined;
  if (!existing) return failure;
  return {
    ...failure,
    hint: SUBMISSION_EXISTS_HINT,
    existingSubmissionId: existing,
  };
}

function testSubmissions(count: number): string {
  return `${count} test submission${count === 1 ? "" : "s"}`;
}

export type DeleteTestsConfirmCopy = {
  title: string;
  /** Why the title cannot name the count. */
  note?: string;
  canDelete: boolean;
};

/** `count` is null when it could not be read; the delete still works. */
export function deleteTestsConfirmCopy(
  count: number | null,
): DeleteTestsConfirmCopy {
  if (count === null) {
    return {
      title: "Delete all test submissions?",
      note: "The number of test submissions could not be read.",
      canDelete: true,
    };
  }
  if (count === 0) {
    return {
      title: "There are no test submissions to delete.",
      canDelete: false,
    };
  }
  return { title: `Delete ${testSubmissions(count)}?`, canDelete: true };
}

export function deleteTestsOutcome(
  result: Result<DeleteTestSubmissionsResponse>,
): TestFlagOutcome {
  if (Result.isError(result)) {
    return { variant: "error", message: result.message, refresh: false };
  }
  return {
    variant: "success",
    message: `Deleted ${testSubmissions(result.value.deletedCount)}.`,
    refresh: true,
  };
}
