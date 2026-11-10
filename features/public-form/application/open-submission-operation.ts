import { getSession } from "@/features/auth";
import type { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import {
  ApiResult,
  EndatixApi,
  ERROR_CODE,
  type Submission,
} from "@/lib/endatix-api";
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
  const resumed = token
    ? await endatix.submissions.public.open(formId, tokensFor(token))
    : undefined;
  if (cookieToken && resumed && isStaleSubmissionToken(cookieToken, resumed)) {
    tokenStore.deleteToken(formId);
  } else if (resumed) {
    return toOperationResult(resumed);
  }

  return createOnOpen(endatix, formId, tokenStore);
}

function toOperationResult(
  opened: ApiResult<Submission>,
): SubmissionOperationResult {
  return ApiResult.isSuccess(opened)
    ? ApiResult.success(toSubmissionOperation(opened.data))
    : opened;
}

/** The cookie's own submission token, refused because its submission ended or expired. */
function isStaleSubmissionToken(
  cookieToken: string,
  resumed: ApiResult<Submission>,
): boolean {
  return (
    ApiResult.isError(resumed) &&
    !isAccessToken(cookieToken) &&
    resumed.error.errorCode === ERROR_CODE.SUBMISSION_TOKEN_INVALID
  );
}

async function createOnOpen(
  endatix: EndatixApi,
  formId: string,
  tokenStore: FormTokenCookieStore,
): Promise<SubmissionOperationResult> {
  const created = await endatix.submissions.public.open(formId, {});
  if (ApiResult.isSuccess(created) && created.data.token) {
    tokenStore.setToken({ formId, token: created.data.token });
  }

  return toOperationResult(created);
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
