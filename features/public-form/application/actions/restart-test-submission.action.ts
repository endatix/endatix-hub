"use server";

import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import { testerSessionUseCase } from "@/features/public-form/use-cases/viewer-can-test-forms.use-case";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, toResult, type ResultType } from "@/lib/result";
import { cookies } from "next/headers";

const NOT_ALLOWED =
  "You do not have permission to start over a test submission.";

const RESTART_LOG = {
  fallbackMessage: "Failed to start over.",
  logMessage: "Failed to start over a test submission.",
  loggerName: "public-form.test-submissions.restart",
} as const;

/** The respondent page is public, so a missing grant is a `Result` error, never a redirect. */
async function testerApi(): Promise<ResultType<EndatixApi>> {
  const session = await testerSessionUseCase();
  if (!session) return Result.error(NOT_ALLOWED);
  return Result.success(new EndatixApi(session.accessToken));
}

/**
 * Start over: discards the test submission and points the form cookie at a new one for the same
 * person. A 404 keeps its status and detail. "Person not found on this form." is the only one
 * that means the person was removed.
 */
export async function restartTestSubmissionAction(
  formId: string,
  submissionId: string,
): Promise<ResultType<void>> {
  const api = await testerApi();
  if (Result.isError(api)) return api;

  const restarted = toResult(
    await api.value.audience.restartTestSubmission(formId, submissionId),
    RESTART_LOG,
  );
  if (Result.isError(restarted)) return restarted;

  const tokenStore = new FormTokenCookieStore(await cookies());
  return tokenStore.setToken({ formId, token: restarted.value.token });
}
