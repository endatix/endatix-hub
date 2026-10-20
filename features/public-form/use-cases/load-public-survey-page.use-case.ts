import {
  resolveSubmissionGate,
  type SubmissionGatePhase,
} from "@/features/submissions/domain";
import type { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import { getActiveDefinitionUseCase } from "@/features/public-form/use-cases/get-active-definition.use-case";
import { getPartialSubmissionUseCase } from "@/features/public-form/use-cases/get-partial-submission.use-case";
import { getPublicFormAccessUseCase } from "@/features/public-form/use-cases/get-public-form-access.use-case";
import { viewerCanTestFormsUseCase } from "@/features/public-form/use-cases/viewer-can-test-forms.use-case";
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
import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
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
  if (urlToken) {
    return loadAccessTokenSurveyPage({ formId, urlToken });
  }

  const publicFormAccessResult = await getPublicFormAccessUseCase({ formId });

  if (Result.isError(publicFormAccessResult)) {
    return mapAccessFailure(publicFormAccessResult);
  }

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
    access: publicFormAccessResult.value,
    activeDefinition: activeDefinitionResult.value,
    submission: submissionResult.value,
  });
}

async function loadAccessTokenSurveyPage({
  formId,
  urlToken,
}: LoadAccessTokenSurveyPageQuery): Promise<LoadPublicSurveyPageResult> {
  const publicFormAccessResult = await getPublicFormAccessUseCase({
    formId,
    token: urlToken,
  });

  if (Result.isError(publicFormAccessResult)) {
    return mapAccessFailure(publicFormAccessResult);
  }

  const submissionResult = await loadAccessTokenSubmission({
    formId,
    urlToken,
  });

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
    urlToken,
  });
}

type LoadedPageQuery = {
  formId: string;
  access: PublicFormAccessResponse;
  activeDefinition: ActiveDefinition;
  submission: Submission | undefined;
  urlToken?: string;
};

/** The page that loaded. A URL-token page never offers the cookie's new response. */
async function loadedPage(
  query: LoadedPageQuery,
): Promise<LoadPublicSurveyPageResult> {
  const { access, activeDefinition, submission, urlToken } = query;
  return {
    kind: "success",
    activeDefinition,
    submissionPhase: submissionPhaseFor(access, submission, Boolean(urlToken)),
    canStartOver: urlToken ? false : access.canStartNewSubmission,
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
  urlToken,
}: LoadedPageQuery): Promise<TestInspectorView | null> {
  const testPage = isTestPage({
    isRespondentTestMode: access.isRespondentTestMode,
    submission,
  });
  if (!testPage || !(await viewerCanTestFormsUseCase())) return null;
  return toTestInspectorView({
    formId,
    submission,
    canStartOver: canStartOverTestSubmission({ submission, urlToken }),
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
  urlToken: string;
};

type LoadAccessTokenSubmissionQuery = {
  formId: string;
  urlToken: string;
};

type LoadedAccessTokenSubmissionResult =
  | {
      kind: "success";
      value: Submission;
    }
  | {
      kind: "tokenSubmissionError";
      errorCode: string;
    };

async function loadAccessTokenSubmission({
  formId,
  urlToken,
}: LoadAccessTokenSubmissionQuery): Promise<LoadedAccessTokenSubmissionResult> {
  const accessTokenResult = await getSubmissionByAccessTokenUseCase({
    formId,
    token: urlToken,
  });

  if (Result.isError(accessTokenResult)) {
    return {
      kind: "tokenSubmissionError",
      errorCode: accessTokenResult.errorCode ?? ERROR_CODE.UNKNOWN_ERROR,
    };
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
