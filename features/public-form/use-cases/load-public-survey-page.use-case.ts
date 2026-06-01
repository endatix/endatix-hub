import { resolveSubmissionGate } from "@/features/public-form/domain/submission-gate";
import type { SubmissionGatePhase } from "@/features/public-form/domain/submission-gate";
import type { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import { getActiveDefinitionUseCase } from "@/features/public-form/use-cases/get-active-definition.use-case";
import { getPartialSubmissionUseCase } from "@/features/public-form/use-cases/get-partial-submission.use-case";
import { getPublicFormAccessUseCase } from "@/features/public-form/use-cases/get-public-form-access.use-case";
import { getSubmissionByAccessTokenUseCase } from "@/features/public-submissions/edit/get-submission-by-access-token.use-case";
import {
  ApiErrorType,
  ApiResult,
  isNotFoundError,
  type Submission,
} from "@/lib/endatix-api";
import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
import { Result } from "@/lib/result";
import type { ActiveDefinition } from "@/types";

/**
 * The query for loading the public survey page.
 * @param formId - The form ID.
 * @param tokenStore - The token store.
 * @param urlToken - The URL token.
 */
export type LoadPublicSurveyPageQuery = {
  formId: string;
  tokenStore: FormTokenCookieStore;
  urlToken?: string;
};

/**
 * The result for loading the public survey page.
 * @param kind - The kind of result.
 * @param activeDefinition - The active definition.
 * @param submissionPhase - The submission gate phase for the survey session.
 * @param isRespondentTestMode - Whether the respondent is submitting a test response.
 * @param submission - The submission.
 */
export type LoadPublicSurveyPageResult =
  | {
      kind: "success";
      activeDefinition: ActiveDefinition;
      submissionPhase: SubmissionGatePhase;
      isRespondentTestMode: boolean;
      submission?: Submission;
    }
  | {
      kind: "notFound";
    }
  | {
      kind: "tokenSubmissionError";
      errorCode: string;
    }
  | {
      kind: "submissionLoadError";
      errorCode: string;
    };

/**
 * Loads the public survey page.
 * @param formId - The form ID.
 * @param tokenStore - The token store.
 * @param urlToken - The URL token.
 * @returns The load public survey page result.
 */
export async function loadPublicSurveyPageUseCase({
  formId,
  tokenStore,
  urlToken,
}: LoadPublicSurveyPageQuery): Promise<LoadPublicSurveyPageResult> {
  const [publicFormAccessResult, submissionResult, activeDefinitionResult] =
    await Promise.all([
      getPublicFormAccessUseCase({ formId, token: urlToken }),
      loadSubmission({ formId, tokenStore, urlToken }),
      getActiveDefinitionUseCase({ formId }),
    ]);

  if (Result.isError(publicFormAccessResult)) {
    return { kind: "notFound" };
  }

  if (
    submissionResult.kind === "tokenSubmissionError" ||
    submissionResult.kind === "submissionLoadError"
  ) {
    return submissionResult;
  }

  if (Result.isError(activeDefinitionResult)) {
    return { kind: "notFound" };
  }

  const hasResumableDraft = Boolean(
    submissionResult.value?.id && !submissionResult.value.isComplete,
  );

  return {
    kind: "success",
    activeDefinition: activeDefinitionResult.value,
    submissionPhase: resolveSubmissionGate({
      canStartNewSubmission:
        publicFormAccessResult.value.canStartNewSubmission,
      hasResumableDraft,
      hasUrlToken: Boolean(urlToken),
    }),
    isRespondentTestMode: publicFormAccessResult.value.isRespondentTestMode,
    submission: submissionResult.value,
  };
}

type LoadedSubmissionResult =
  | {
      kind: "success";
      value?: Submission;
    }
  | {
      kind: "tokenSubmissionError";
      errorCode: string;
    }
  | {
      kind: "submissionLoadError";
      errorCode: string;
    };

async function loadSubmission({
  formId,
  tokenStore,
  urlToken,
}: LoadPublicSurveyPageQuery): Promise<LoadedSubmissionResult> {
  if (urlToken) {
    const accessTokenResult = await getSubmissionByAccessTokenUseCase({
      formId,
      token: urlToken,
    });

    if (Result.isError(accessTokenResult)) {
      return {
        kind: "tokenSubmissionError",
        errorCode:
          accessTokenResult.errorCode ?? ERROR_CODE.UNKNOWN_ERROR,
      };
    }

    return {
      kind: "success",
      value: accessTokenResult.value,
    };
  }

  const partialResult = await getPartialSubmissionUseCase({
    formId,
    tokenStore,
  });

  if (ApiResult.isSuccess(partialResult)) {
    return {
      kind: "success",
      value: partialResult.data,
    };
  }

  if (isNotFoundError(partialResult)) {
    return {
      kind: "success",
      value: undefined,
    };
  }

  if (partialResult.error.type === ApiErrorType.ValidationError) {
    return {
      kind: "success",
      value: undefined,
    };
  }

  return {
    kind: "submissionLoadError",
    errorCode: partialResult.error.errorCode ?? ERROR_CODE.UNKNOWN_ERROR,
  };
}
