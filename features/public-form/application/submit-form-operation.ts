import { getPostHog } from "@/features/analytics/posthog/server/node-client";
import { getSession } from "@/features/auth";
import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import { SubmissionData } from "@/features/submissions/types";
import { ApiResult, EndatixApi, ERROR_CODE } from "@/lib/endatix-api";
import type { Submission } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { isAccessToken } from "@/lib/utils";

export type SubmissionOperation = {
  submissionId: string;
  isComplete?: boolean;
  status?: string;
  completedAt?: string;
};

export type SubmissionOperationResult = ApiResult<SubmissionOperation>;

function logApiError<T>(
  result: ApiResult<T>,
  properties: Record<string, unknown>,
): ApiResult<T> {
  if (ApiResult.isError(result)) {
    const postHog = getPostHog();
    if (postHog) {
      postHog.captureException(result.error, "", properties);
    }
  }

  return result;
}

function toSubmissionOperation(submission: Submission): SubmissionOperation {
  const completedAt = submission.completedAt
    ? new Date(submission.completedAt)
    : undefined;

  return {
    submissionId: submission.id,
    isComplete: submission.isComplete,
    status: submission.status,
    completedAt:
      completedAt && !Number.isNaN(completedAt.getTime())
        ? completedAt.toISOString()
        : undefined,
  };
}

function syncSubmissionCookie(
  formId: string,
  submissionData: SubmissionData,
  tokenStore: FormTokenCookieStore,
  submission: Submission,
  syncCookies: boolean,
  token?: string,
): void {
  if (!syncCookies) {
    return;
  }

  if (submissionData.isComplete === true || submission.isComplete === true) {
    tokenStore.deleteToken(formId);
    return;
  }

  if (token) {
    tokenStore.setToken({ formId, token });
  }
}

function finalizeCreateResult(
  formId: string,
  submissionData: SubmissionData,
  tokenStore: FormTokenCookieStore,
  createResult: ApiResult<Submission>,
): SubmissionOperationResult {
  if (ApiResult.isSuccess(createResult)) {
    syncSubmissionCookie(
      formId,
      submissionData,
      tokenStore,
      createResult.data,
      true,
      createResult.data.token,
    );

    return ApiResult.success(toSubmissionOperation(createResult.data));
  }

  if (createResult.error.errorCode === ERROR_CODE.SUBMISSION_TOKEN_INVALID) {
    tokenStore.deleteToken(formId);
  }

  return logApiError(createResult, { formId });
}

/**
 * Submits a form by either updating an existing submission or creating a new one.
 * @param formId - The ID of the form.
 * @param submissionData - The submission data.
 * @param tokenStore - The token store.
 * @param urlToken - The URL token.
 * @returns The submission operation result.
 */
export async function submitFormOperation(
  formId: string,
  submissionData: SubmissionData,
  tokenStore: FormTokenCookieStore,
  urlToken?: string,
): Promise<SubmissionOperationResult> {
  const syncCookies = !urlToken;

  const tokenResult = tokenStore.getToken(formId);

  if (urlToken) {
    return updateExistingSubmissionViaToken(
      formId,
      urlToken,
      submissionData,
      tokenStore,
      syncCookies,
    );
  }

  if (Result.isSuccess(tokenResult)) {
    return updateExistingSubmissionViaToken(
      formId,
      tokenResult.value,
      submissionData,
      tokenStore,
      syncCookies,
    );
  }

  return createSubmission(formId, submissionData, tokenStore);
}

/**
 * Updates an existing submission via a token.
 * @param formId - The ID of the form.
 * @param token - The token.
 * @param submissionData - The submission data.
 * @param tokenStore - The token store.
 * @param syncCookies - Whether to sync cookies.
 * @returns The submission operation result.
 */
async function updateExistingSubmissionViaToken(
  formId: string,
  token: string,
  submissionData: SubmissionData,
  tokenStore: FormTokenCookieStore,
  syncCookies: boolean,
): Promise<SubmissionOperationResult> {
  const endatix = new EndatixApi(await getSession());
  const updateResult = isAccessToken(token)
    ? await endatix.submissions.public.updateByAccessToken(
        formId,
        token,
        submissionData,
      )
    : await endatix.submissions.public.updateByToken(
        formId,
        token,
        submissionData,
      );

  if (ApiResult.isSuccess(updateResult)) {
    syncSubmissionCookie(
      formId,
      submissionData,
      tokenStore,
      updateResult.data,
      syncCookies,
    );

    return ApiResult.success(toSubmissionOperation(updateResult.data));
  }

  if (
    syncCookies &&
    updateResult.error.errorCode === ERROR_CODE.SUBMISSION_TOKEN_INVALID
  ) {
    tokenStore.deleteToken(formId);
    const recoveryResult = await createSubmission(
      formId,
      submissionData,
      tokenStore,
    );

    if (ApiResult.isError(recoveryResult)) {
      logApiError(recoveryResult, { formId });
    }

    return recoveryResult;
  }

  return logApiError(updateResult, { formId, token });
}

async function createSubmission(
  formId: string,
  submissionData: SubmissionData,
  tokenStore: FormTokenCookieStore,
): Promise<SubmissionOperationResult> {
  const endatix = new EndatixApi(await getSession());

  return finalizeCreateResult(
    formId,
    submissionData,
    tokenStore,
    await endatix.submissions.public.create(formId, submissionData),
  );
}
