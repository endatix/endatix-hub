import type { TestInspectorView } from "@/features/public-form/inspect-test-submission/test-inspector-view";
import type { Submission } from "@/lib/endatix-api";
import { PersonalizationSource } from "@/lib/endatix-api/submissions/types";

export type TestPageInput = {
  isRespondentTestMode: boolean;
  submission?: Submission;
};

/** What the page's corner shows: the Test inspector for a tester, the plain notice, or nothing. */
export type TestCorner = "inspector" | "notice" | "none";

export type TestCornerInput = TestPageInput & {
  /** Built by the server only for a viewer with `forms.test`; null for everyone else. */
  testInspector: TestInspectorView | null;
};

/** A test submission opened with Test as this person: the only kind Start over applies to. */
export function isPersonTestSubmission(
  submission: Submission | undefined,
): boolean {
  return submission?.personalization?.source === PersonalizationSource.Test;
}

/** Test mode or a test submission: the page says so. A real respondent's page never does. */
export function isTestPage({
  isRespondentTestMode,
  submission,
}: TestPageInput): boolean {
  return isRespondentTestMode || submission?.isTestSubmission === true;
}

/**
 * Start over swaps the form cookie's token, so it applies only to a person's test submission loaded from
 * that cookie, never to a URL-token page. Whether the viewer may test forms is the caller's check.
 */
export function canStartOverTestSubmission({
  submission,
  urlToken,
}: {
  submission?: Submission;
  urlToken?: string;
}): boolean {
  return (
    !urlToken && Boolean(submission?.id) && isPersonTestSubmission(submission)
  );
}

/** inspector: a test page and a tester's view. notice: a test page, no view. none: a real respondent. */
export function testCornerFor(survey: TestCornerInput): TestCorner {
  if (!isTestPage(survey)) return "none";
  return survey.testInspector ? "inspector" : "notice";
}

/**
 * A person's test submission loaded from the cookie saves with its own token. Test as this person
 * and Start over repoint the form cookie, so a tab already open on another test submission would
 * otherwise write its answers into the new one.
 */
export function testWriteToken({
  submission,
  urlToken,
}: {
  submission?: Submission;
  urlToken?: string;
}): string | undefined {
  if (urlToken || !isPersonTestSubmission(submission)) return undefined;
  return submission?.token || undefined;
}
