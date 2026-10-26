import {
  resolveSubmissionGate,
  type SubmissionGatePhase,
} from "@/features/submissions/domain";
import type { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import { getActiveDefinitionUseCase } from "@/features/public-form/use-cases/get-active-definition.use-case";
import { getPartialSubmissionUseCase } from "@/features/public-form/use-cases/get-partial-submission.use-case";
import { getPublicFormAccessUseCase } from "@/features/public-form/use-cases/get-public-form-access.use-case";
import { testerAccessUseCase } from "@/features/public-form/use-cases/viewer-can-test-forms.use-case";
import {
  toTestInspectorView,
  type TestInspectorView,
} from "@/features/public-form/inspect-test-submission/test-inspector-view";
import {
  canStartOverTestSubmission,
  isTestPage,
} from "@/features/public-form/test-submission-mode";
import { getSubmissionByAccessTokenUseCase } from "@/features/public-submissions/edit/get-submission-by-access-token.use-case";
import { resolveSubmissionFormDefinition } from "@/features/public-submissions/resolve-submission-form-definition";
import {
  ApiErrorType,
  ApiResult,
  isNotFoundError,
  type Submission,
} from "@/lib/endatix-api";
import type { PublicFormAccessResponse } from "@/lib/endatix-api/forms/types";
import {
  ERROR_CODE,
  REFUSED_TOKEN_CODES,
} from "@/lib/endatix-api/shared/error-codes";
import { Result, type ResultType } from "@/lib/result";
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
 * @param canStartOver - Whether a finished cookie submission may be replaced by a new one.
 * @param isRespondentTestMode - Whether the respondent is submitting a test response.
 * @param testInspector - The Test inspector's view; only for a viewer who may test forms on a test page.
 * @param submission - The submission.
 */
export type LoadPublicSurveyPageResult =
  | {
      kind: "success";
      activeDefinition: ActiveDefinition;
      submissionPhase: SubmissionGatePhase;
      canStartOver: boolean;
      isRespondentTestMode: boolean;
      testInspector: TestInspectorView | null;
      submission?: Submission;
    }
  | {
      kind: "notFound";
    }
  | {
      kind: "unauthorized";
    }
  | {
      kind: "forbidden";
    }
  | {
      kind: "formUnavailable";
      title: string;
      message: string;
    }
  | {
      kind: "accessLoadError";
      errorCode: string;
    }
  | TokenSubmissionErrorResult
  | {
      kind: "submissionLoadError";
      errorCode: string;
    };

/**
 * Loads the public survey page. A URL token, or an access token in the form cookie (a personalized
 * link's), opens that one submission whatever the form's privacy.
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
  const cookieToken = urlToken ? undefined : tokenStore.getAccessToken(formId);
  const accessToken = urlToken ?? cookieToken;
  return accessToken
    ? loadAccessTokenSurveyPage({
        formId,
        accessToken,
        personalLink: Boolean(cookieToken),
      })
    : loadCookieSurveyPage({ formId, tokenStore });
}

/** The anonymous or signed-in page, with the cookie's submission token when it has one. */
async function loadCookieSurveyPage({
  formId,
  tokenStore,
}: LoadPartialSubmissionQuery): Promise<LoadPublicSurveyPageResult> {
  const publicFormAccessResult = await getPublicFormAccessUseCase({ formId });

  if (Result.isError(publicFormAccessResult)) {
    return mapAccessFailure(publicFormAccessResult);
  }

  return loadCookieSubmissionPage({
    formId,
    tokenStore,
    access: publicFormAccessResult.value,
  });
}

type LoadCookieSubmissionPageQuery = LoadPartialSubmissionQuery & {
  access: PublicFormAccessResponse;
};

async function loadCookieSubmissionPage(
  query: LoadCookieSubmissionPageQuery,
): Promise<LoadPublicSurveyPageResult> {
  const { formId, tokenStore, access } = query;
  const [submissionResult, activeDefinitionResult] = await Promise.all([
    loadPartialSubmission({ formId, tokenStore }),
    getActiveDefinitionUseCase({ formId }),
  ]);

  if (submissionResult.kind === "submissionLoadError") {
    return submissionResult;
  }

  if (Result.isError(activeDefinitionResult)) {
    return { kind: "notFound" };
  }

  return loadedPage({
    formId,
    access,
    activeDefinition: activeDefinitionResult.value,
    submission: submissionResult.value,
  });
}

async function loadAccessTokenSurveyPage(
  query: LoadAccessTokenSurveyPageQuery,
): Promise<LoadPublicSurveyPageResult> {
  const { formId, accessToken } = query;
  const publicFormAccessResult = await getPublicFormAccessUseCase({
    formId,
    token: accessToken,
  });
  if (Result.isError(publicFormAccessResult)) {
    return mapAccessTokenFailure(publicFormAccessResult, query);
  }

  const submissionResult = await loadAccessTokenSubmission(query);
  if (submissionResult.kind === "tokenSubmissionError") {
    return submissionResult;
  }

  const activeDefinitionResult = resolveSubmissionFormDefinition(
    submissionResult.value,
  );
  if (Result.isError(activeDefinitionResult)) {
    return { kind: "notFound" };
  }

  return loadedPage({
    formId,
    access: publicFormAccessResult.value,
    activeDefinition: activeDefinitionResult.value,
    submission: submissionResult.value,
    accessToken,
  });
}

type LoadedPageQuery = {
  formId: string;
  access: PublicFormAccessResponse;
  activeDefinition: ActiveDefinition;
  submission: Submission | undefined;
  accessToken?: string;
};

/** The page that loaded. A token page (URL, or a personalized link's cookie) never offers a new response. */
async function loadedPage(
  query: LoadedPageQuery,
): Promise<LoadPublicSurveyPageResult> {
  const { access, activeDefinition, submission, accessToken } = query;
  return {
    kind: "success",
    activeDefinition,
    submissionPhase: submissionPhaseFor(
      access,
      submission,
      Boolean(accessToken),
    ),
    canStartOver: accessToken ? false : access.canStartNewSubmission,
    isRespondentTestMode: access.isRespondentTestMode,
    testInspector: await testInspectorFor(query),
    submission,
  };
}

function submissionPhaseFor(
  access: PublicFormAccessResponse,
  submission: Submission | undefined,
  hasUrlToken: boolean,
): SubmissionGatePhase {
  return resolveSubmissionGate({
    canStartNewSubmission: access.canStartNewSubmission,
    hasUserSubmitted: access.hasUserSubmitted,
    hasUrlToken,
    hasSubmission: Boolean(submission?.id),
    collectionStatus: submission?.collectionStatus,
    isComplete: submission?.isComplete ?? false,
  });
}

/**
 * The tester's view of a test page. Asks for `forms.test` only when the page is a test page, so a
 * real respondent's load never reaches `auth()`.
 */
async function testInspectorFor({
  formId,
  access,
  submission,
  accessToken: urlToken,
}: LoadedPageQuery): Promise<TestInspectorView | null> {
  const testPage = isTestPage({
    isRespondentTestMode: access.isRespondentTestMode,
    submission,
  });
  if (!testPage) return null;
  const tester = await testerAccessUseCase();
  if (!tester) return null;
  return toTestInspectorView({
    formId,
    submission,
    canStartOver: canStartOverTestSubmission({ submission, urlToken }),
    canOpenParticipant: tester.canOpenParticipant,
  });
}

const RESPONDENT_COPY_MAX_LENGTH = 240;

function mapAccessFailure(result: ResultType<unknown>): Extract<
  LoadPublicSurveyPageResult,
  {
    kind:
      | "notFound"
      | "unauthorized"
      | "forbidden"
      | "formUnavailable"
      | "accessLoadError";
  }
> {
  if (!Result.isError(result)) {
    return { kind: "notFound" };
  }

  if (result.errorCode === ERROR_CODE.FORM_UNAVAILABLE) {
    const title = plainRespondentCopy(result.problemTitle);
    const message = plainRespondentCopy(result.message);
    if (
      result.problemMediaType === "application/problem+json" &&
      title &&
      message
    ) {
      return { kind: "formUnavailable", title, message };
    }

    return { kind: "forbidden" };
  }

  if (result.errorCode === ERROR_CODE.AUTHENTICATION_REQUIRED) {
    return { kind: "unauthorized" };
  }

  if (result.errorCode === ERROR_CODE.ACCESS_FORBIDDEN) {
    return { kind: "forbidden" };
  }

  if (isMissingFormAccessError(result.errorCode)) {
    return { kind: "notFound" };
  }

  return {
    kind: "accessLoadError",
    errorCode: result.errorCode ?? ERROR_CODE.UNKNOWN_ERROR,
  };
}

/** A refused token needs a new link, not a retry: the token page says so. */
function mapAccessTokenFailure(
  result: ResultType<unknown>,
  { personalLink }: LoadAccessTokenSurveyPageQuery,
): LoadPublicSurveyPageResult {
  const errorCode = Result.isError(result) ? result.errorCode : undefined;
  return errorCode && REFUSED_TOKEN_CODES.has(errorCode)
    ? tokenSubmissionError(errorCode, personalLink)
    : mapAccessFailure(result);
}

type TokenSubmissionErrorResult = {
  kind: "tokenSubmissionError";
  errorCode: string;
  /** The token came from a personalized link's cookie: the person can reopen their link. */
  personalLink?: true;
};

function tokenSubmissionError(
  code: string | undefined,
  personalLink: boolean,
): TokenSubmissionErrorResult {
  const errorCode = code ?? ERROR_CODE.UNKNOWN_ERROR;
  return personalLink
    ? { kind: "tokenSubmissionError", errorCode, personalLink }
    : { kind: "tokenSubmissionError", errorCode };
}

function plainRespondentCopy(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const stripped = value.replace(/\s+/g, " ").trim();
  if (!stripped) {
    return undefined;
  }

  return stripped.slice(0, RESPONDENT_COPY_MAX_LENGTH);
}

function isMissingFormAccessError(errorCode: string | undefined): boolean {
  return (
    errorCode === ERROR_CODE.RESOURCE_NOT_FOUND ||
    errorCode === ERROR_CODE.FORM_NOT_FOUND
  );
}

type LoadAccessTokenSurveyPageQuery = {
  formId: string;
  accessToken: string;
  personalLink: boolean;
};

type LoadedAccessTokenSubmissionResult =
  | {
      kind: "success";
      value: Submission;
    }
  | TokenSubmissionErrorResult;

async function loadAccessTokenSubmission({
  formId,
  accessToken,
  personalLink,
}: LoadAccessTokenSurveyPageQuery): Promise<LoadedAccessTokenSubmissionResult> {
  const accessTokenResult = await getSubmissionByAccessTokenUseCase({
    formId,
    token: accessToken,
  });

  if (Result.isError(accessTokenResult)) {
    return tokenSubmissionError(accessTokenResult.errorCode, personalLink);
  }

  return {
    kind: "success",
    value: accessTokenResult.value,
  };
}

type LoadPartialSubmissionQuery = {
  formId: string;
  tokenStore: FormTokenCookieStore;
};

type LoadedPartialSubmissionResult =
  | {
      kind: "success";
      value?: Submission;
    }
  | {
      kind: "submissionLoadError";
      errorCode: string;
    };

async function loadPartialSubmission({
  formId,
  tokenStore,
}: LoadPartialSubmissionQuery): Promise<LoadedPartialSubmissionResult> {
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
