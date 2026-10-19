import type { Submission } from "@/lib/endatix-api";
import { PersonalizationSource } from "@/lib/endatix-api/submissions/types";

export type TestSubmissionModeInput = {
  isRespondentTestMode: boolean;
  /** The signed-in viewer has `forms.test`; checked only for a test submission (`isPersonTestSubmission`). */
  canStartOverTest?: boolean;
  submission?: Submission;
  urlToken?: string;
};

export type TestSubmissionMode = {
  showBadge: boolean;
  /** The test submission the badge's Start over replaces, or null when it has none. */
  startOverSubmissionId: string | null;
};

/** A test submission opened with Test as this person: the only kind Start over applies to. */
export function isPersonTestSubmission(
  submission: Submission | undefined,
): boolean {
  return submission?.personalization?.source === PersonalizationSource.Test;
}

/**
 * Start over swaps the form cookie's token, so it applies only to a person's test submission loaded from
 * that cookie, never to a URL-token page, and only for a viewer who may test forms.
 */
function startOverSubmissionId({
  canStartOverTest,
  submission,
  urlToken,
}: TestSubmissionModeInput): string | null {
  if (!canStartOverTest || urlToken || !submission?.id) return null;
  return isPersonTestSubmission(submission) ? String(submission.id) : null;
}

/** What the respondent page says about testing: the badge, and whether it can start over. */
export function testSubmissionMode(
  input: TestSubmissionModeInput,
): TestSubmissionMode {
  return {
    showBadge:
      input.isRespondentTestMode || input.submission?.isTestSubmission === true,
    startOverSubmissionId: startOverSubmissionId(input),
  };
}
