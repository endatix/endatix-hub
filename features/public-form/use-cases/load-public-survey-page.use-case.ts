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
import { Result, type Error as Failure } from "@/lib/result";
import { parseSurveyJson } from "@/lib/survey-js/survey-json";
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
  | (PageSession & {
      kind: "finished";
      submissionPhase: "completed" | "closed";
    })
  | (PageSession & { kind: "success"; activeDefinition: ActiveDefinition })
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
  const submissionResult = await loadPartialSubmission(query);
  if (submissionResult.kind === "submissionLoadError") {
    return submissionResult;
  }

  const submission = submissionResult.value;
  const session = await pageSession({ ...query, submission });
  const { submissionPhase } = session;
  if (submissionPhase === "completed" || submissionPhase === "closed") {
    return { ...session, kind: "finished", submissionPhase };
  }

  const current = await getActiveDefinitionUseCase({ formId: query.formId });
  if (Result.isError(current)) {
    return mapAccessFailure(current);
  }
  if (!submission || submissionPhase === "blocked") {
    return { ...session, kind: "success", activeDefinition: current.value };
  }
  return resumeCookieSubmission(session, submission, current.value);
}

const submissionUnavailable = {
  kind: "submissionLoadError",
  errorCode: ERROR_CODE.RESOURCE_NOT_FOUND,
} as const;

function resumeCookieSubmission(
  session: PageSession,
  submission: Submission,
  current: ActiveDefinition,
): LoadPublicSurveyPageResult {
  const bound = resolveSubmissionFormDefinition(submission);
  if (Result.isError(bound) || !parseSurveyJson(bound.value.jsonData)) {
    return submissionUnavailable;
  }
  return {
    ...session,
    kind: "success",
    activeDefinition: withCurrentFormSettings(bound.value, current),
  };
}

function withCurrentFormSettings(
  bound: ActiveDefinition,
  current: ActiveDefinition,
): ActiveDefinition {
  return {
    ...bound,
    customQuestions: current.customQuestions,
    requiresReCaptcha: current.requiresReCaptcha,
    limitOnePerUser: current.limitOnePerUser,
    themeModel: current.themeModel,
    metadata: current.metadata,
  };
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

  const submission = submissionResult.value;
  const activeDefinitionResult = resolveSubmissionFormDefinition(submission);
  if (Result.isError(activeDefinitionResult)) {
    return { kind: "notFound" };
  }

  const access = publicFormAccessResult.value;
  const session = await pageSession({ formId, access, submission, accessToken });
  return {
    ...session,
    kind: "success",
    activeDefinition: activeDefinitionResult.value,
  };
}

type LoadedPageQuery = {
  formId: string;
  access: PublicFormAccessResponse;
  submission: Submission | undefined;
  accessToken?: string;
};

/** The page that loaded. A token page (URL, or a personalized link's cookie) never offers a new response. */
type PageSession = {
  submissionPhase: SubmissionGatePhase;
  canStartOver: boolean;
  isRespondentTestMode: boolean;
  testInspector: TestInspectorView | null;
  submission?: Submission;
};

async function pageSession(query: LoadedPageQuery): Promise<PageSession> {
  const { access, submission, accessToken } = query;
  return {
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

function mapAccessFailure(result: Failure): Extract<
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
  const { statusCode, errorCode } = result;
  if (errorCode === ERROR_CODE.FORM_UNAVAILABLE) return unavailableForm(result);
  if (statusCode === 401 || errorCode === ERROR_CODE.AUTHENTICATION_REQUIRED) {
    return { kind: "unauthorized" };
  }

  if (statusCode === 403 || errorCode === ERROR_CODE.ACCESS_FORBIDDEN) {
    return { kind: "forbidden" };
  }

  if (statusCode === 404 || isMissingFormAccessError(errorCode)) {
    return { kind: "notFound" };
  }

  return {
    kind: "accessLoadError",
    errorCode: errorCode ?? ERROR_CODE.UNKNOWN_ERROR,
  };
}

function unavailableForm(
  result: Failure,
): Extract<
  LoadPublicSurveyPageResult,
  { kind: "formUnavailable" | "forbidden" }
> {
  const title = plainRespondentCopy(result.problemTitle);
  const message = plainRespondentCopy(result.message);
  return result.problemMediaType === "application/problem+json" &&
    title &&
    message
    ? { kind: "formUnavailable", title, message }
    : { kind: "forbidden" };
}

/** A refused token needs a new link, not a retry: the token page says so. */
function mapAccessTokenFailure(
  result: Failure,
  { personalLink }: LoadAccessTokenSurveyPageQuery,
): LoadPublicSurveyPageResult {
  const { errorCode } = result;
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
