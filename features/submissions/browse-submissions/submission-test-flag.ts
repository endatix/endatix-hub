import type { DeleteTestSubmissionsResponse } from "@/lib/endatix-api/submissions/types";
import { Permissions } from "@/features/auth/authorization/domain/permissions";
import { Result } from "@/lib/result";

export type SubmissionTestMark = { isTestSubmission: boolean };

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

/** The permissions `submissionTestAccess` reads. */
export const SUBMISSION_TEST_PERMISSIONS = [
  Permissions.Forms.Test,
  Permissions.Submissions.Delete,
] as const;

export function submissionTestAccess(
  granted: Readonly<Record<string, boolean>>,
): SubmissionTestAccess {
  const canMark = granted[Permissions.Forms.Test] === true;
  return {
    canMark,
    canDeleteTests: canMark && granted[Permissions.Submissions.Delete] === true,
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
  /** The real submission that blocks Mark as real, for a link to it. */
  existingSubmissionId?: string;
};

const SUBMISSION_EXISTS = "submission_exists";

export const SUBMISSION_EXISTS_MESSAGE =
  "The submitter already has a real submission on this form. Mark that one as test first.";

export function testMarkOutcome(
  isTest: boolean,
  result: Result<SubmissionTestMark>,
): TestMarkOutcome {
  if (Result.isSuccess(result)) {
    const kind = isTest ? "test" : "real";
    return {
      variant: "success",
      message: `Marked as a ${kind} submission.`,
      refresh: true,
    };
  }
  if (result.errorCode === SUBMISSION_EXISTS && result.existingId) {
    return {
      variant: "error",
      message: SUBMISSION_EXISTS_MESSAGE,
      refresh: false,
      existingSubmissionId: result.existingId,
    };
  }
  return { variant: "error", message: result.message, refresh: false };
}

function testSubmissions(count: number): string {
  return `${count} test submission${count === 1 ? "" : "s"}`;
}

/** `count` is null while it loads or when it could not be read. */
export function deleteTestsConfirmCopy(count: number | null): {
  title: string;
  canDelete: boolean;
} {
  if (count === null) {
    return { title: "Delete all test submissions?", canDelete: true };
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
