import { getSession } from "@/features/auth";
import type { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import { ApiResult, EndatixApi, ERROR_CODE } from "@/lib/endatix-api";
import type { OpenSubmissionTokens } from "@/lib/endatix-api/submissions/types";
import { Result } from "@/lib/result";
import { isAccessToken } from "@/lib/utils";
import {
  toSubmissionOperation,
  type SubmissionOperationResult,
} from "./submit-form-operation";

/**
 * Records that the respondent opened the form, so the submission's time starts here rather than
 * at the first answer. It resolves the token the way a save does: the URL token, else the
 * cookie's. With none it creates the submission and keeps its token in the cookie, so the saves
 * that follow update it. A cookie token the API no longer accepts starts a new submission, as a
 * save would.
 * @param formId - The form the respondent opened.
 * @param tokenStore - The form token cookie store.
 * @param urlToken - The URL token (a share link's); the cookie is then left alone.
 */
export async function openSubmissionOperation(
  formId: string,
  tokenStore: FormTokenCookieStore,
  urlToken?: string,
): Promise<SubmissionOperationResult> {
  const endatix = new EndatixApi(await getSession());
  const cookieToken = urlToken ? undefined : storedToken(tokenStore, formId);
  const token = urlToken ?? cookieToken;
  if (!token) {
    return createOnOpen(endatix, formId, tokenStore);
  }

  const resumed = await endatix.submissions.public.open(
    formId,
    tokensFor(token),
  );
  if (
    cookieToken &&
    ApiResult.isError(resumed) &&
    !isAccessToken(cookieToken) &&
    resumed.error.errorCode === ERROR_CODE.SUBMISSION_TOKEN_INVALID
  ) {
    tokenStore.deleteToken(formId);
    return createOnOpen(endatix, formId, tokenStore);
  }

  return ApiResult.isSuccess(resumed)
    ? ApiResult.success(toSubmissionOperation(resumed.data))
    : resumed;
}

async function createOnOpen(
  endatix: EndatixApi,
  formId: string,
  tokenStore: FormTokenCookieStore,
): Promise<SubmissionOperationResult> {
  const created = await endatix.submissions.public.open(formId, {});
  if (ApiResult.isError(created)) {
    return created;
  }

  if (created.data.token) {
    tokenStore.setToken({ formId, token: created.data.token });
  }

  return ApiResult.success(toSubmissionOperation(created.data));
}

function storedToken(
  tokenStore: FormTokenCookieStore,
  formId: string,
): string | undefined {
  const stored = tokenStore.getToken(formId);
  return Result.isSuccess(stored) ? stored.value : undefined;
}

function tokensFor(token: string): OpenSubmissionTokens {
  return isAccessToken(token)
    ? { accessToken: token }
    : { submissionToken: token };
}
