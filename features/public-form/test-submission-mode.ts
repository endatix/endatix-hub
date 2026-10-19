import type { Submission } from "@/lib/endatix-api";
import { PersonalizationSource } from "@/lib/endatix-api/submissions/types";

export type TestSubmissionModeInput = {
  isRespondentTestMode: boolean;
  submission?: Submission;
  urlToken?: string;
};

export type TestSubmissionMode = {
  showBadge: boolean;
  /** The test submission the badge's Start over replaces, or null when it has none. */
  startOverSubmissionId: string | null;
};

/**
 * Start over swaps the form cookie's token, so it applies only to a test submission opened with
 * Test as this person and loaded from that cookie, never to a URL-token page.
 */
function startOverSubmissionId({
  isRespondentTestMode,
  submission,
  urlToken,
}: TestSubmissionModeInput): string | null {
  if (!isRespondentTestMode || urlToken || !submission?.id) return null;
  const source = submission.personalization?.source;
  return source === PersonalizationSource.Test ? String(submission.id) : null;
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
