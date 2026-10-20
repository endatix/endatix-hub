"use server";

import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import { testerSessionUseCase } from "@/features/public-form/use-cases/viewer-can-test-forms.use-case";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, toResult, type ResultType } from "@/lib/result";
import { cookies } from "next/headers";

const NOT_ALLOWED =
  "You do not have permission to start over a test submission.";
const NOT_IN_COOKIE =
  "This test submission is no longer open in this browser. Reload the page.";

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

type RestartTarget = { formId: string; submissionId: string };

/** Sends the cookie's token, so only the test submission this browser holds can be discarded. */
async function restartFromCookie(
  api: EndatixApi,
  tokenStore: FormTokenCookieStore,
  { formId, submissionId }: RestartTarget,
): Promise<ResultType<void>> {
  const token = tokenStore.getToken(formId);
  if (Result.isError(token)) return Result.error(NOT_IN_COOKIE);

  const restarted = toResult(
    await api.audience.restartTestSubmission(formId, submissionId, token.value),
    RESTART_LOG,
  );
  if (Result.isError(restarted)) return restarted;
  return tokenStore.setToken({ formId, token: restarted.value.token });
}

/**
 * Start over: discards the test submission and points the form cookie at a new one for the same
 * person. The API answers 404 when the cookie's token is not `submissionId`'s. A 404 keeps its
 * status and detail. "Person not found on this form." is the only one that means the person was
 * removed.
 */
export async function restartTestSubmissionAction(
  formId: string,
  submissionId: string,
): Promise<ResultType<void>> {
  const api = await testerApi();
  if (Result.isError(api)) return api;

  const tokenStore = new FormTokenCookieStore(await cookies());
  return restartFromCookie(api.value, tokenStore, { formId, submissionId });
}
