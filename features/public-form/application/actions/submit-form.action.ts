"use server";

import { getPostHog } from "@/features/analytics/posthog/server/node-client";
import { getSession } from "@/features/auth";
import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import { SubmissionData } from "@/features/submissions/types";
import { ApiResult, EndatixApi, ERROR_CODE } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { isAccessToken } from "@/lib/utils";
import { cookies } from "next/headers";

export type SubmissionOperation = {
  submissionId: string;
};

export type SubmissionOperationResult = ApiResult<SubmissionOperation>;

/**
 * Handles form submission by either updating an existing submission or creating a new one.
 * Uses Next.js server side processing of cookies to securely track partial submissions across requests.
 *
 * @param formId - The unique identifier of the form being submitted
 * @param submissionData - The data being submitted, including form responses and completion status
 * @param urlToken - Optional token from URL query string. When provided, cookie operations are bypassed.
 * @returns A Result indicating success or failure of the submission operation
 */
export async function submitFormAction(
  formId: string,
  submissionData: SubmissionData,
  urlToken?: string,
): Promise<SubmissionOperationResult> {
  // Get cookie store and check for existing submission token
  const cookieStore = await cookies();
  const tokenStore = new FormTokenCookieStore(cookieStore);
  const performCookieOperations = !urlToken;

  if (urlToken) {
    return await updateExistingSubmissionViaToken(
      formId,
      urlToken,
      submissionData,
      tokenStore,
      performCookieOperations,
    );
  }

  const tokenResult = tokenStore.getToken(formId);
  const submissionOperationResult = Result.isSuccess(tokenResult)
    ? await updateExistingSubmissionViaToken(
        formId,
        tokenResult.value,
        submissionData,
        tokenStore,
        performCookieOperations,
      )
    : await createNewSubmission(formId, submissionData, tokenStore);

  return submissionOperationResult;
}

async function updateExistingSubmissionViaToken(
  formId: string,
  token: string,
  submissionData: SubmissionData,
  tokenStore: FormTokenCookieStore,
  performCookieOperations: boolean,
): Promise<ApiResult<SubmissionOperation>> {
  const session = await getSession();
  const endatix = new EndatixApi(session);

  const updateByTokenResult = isAccessToken(token)
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

  if (ApiResult.isSuccess(updateByTokenResult)) {
    if (performCookieOperations && updateByTokenResult.data.isComplete) {
      tokenStore.deleteToken(formId);
    }

    return ApiResult.success({ submissionId: updateByTokenResult.data.id });
  } else {
    if (
      performCookieOperations &&
      updateByTokenResult.error.errorCode ===
      ERROR_CODE.SUBMISSION_TOKEN_INVALID
    ) {
      tokenStore.deleteToken(formId);
    }

    const postHog = getPostHog();
    if (postHog) {
      postHog.captureException(updateByTokenResult.error, "", {
        formId,
        token,
      });
    }

    return updateByTokenResult;
  }
}

async function createNewSubmission(
  formId: string,
  submissionData: SubmissionData,
  tokenStore: FormTokenCookieStore,
): Promise<ApiResult<SubmissionOperation>> {
  const session = await getSession();
  const endatix = new EndatixApi(session);
  const createSubmissionResult = await endatix.submissions.public.create(
    formId,
    submissionData,
  );

  if (ApiResult.isSuccess(createSubmissionResult)) {
    if (createSubmissionResult.data.isComplete) {
      tokenStore.deleteToken(formId);
    } else {
      tokenStore.setToken({ formId, token: createSubmissionResult.data.token });
    }
    return ApiResult.success({ submissionId: createSubmissionResult.data.id });
  } else {
    if (
      createSubmissionResult.error.errorCode ===
      ERROR_CODE.SUBMISSION_TOKEN_INVALID
    ) {
      tokenStore.deleteToken(formId);
    }

    const postHog = getPostHog();
    if (postHog) {
      postHog.captureException(createSubmissionResult.error, "", {
        formId,
      });
    }

    return createSubmissionResult;
  }
}
