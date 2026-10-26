import { getActiveDefinitionUseCase } from "@/features/public-form/use-cases/get-active-definition.use-case";
import { getPartialSubmissionUseCase } from "@/features/public-form/use-cases/get-partial-submission.use-case";
import { getPublicFormAccessUseCase } from "@/features/public-form/use-cases/get-public-form-access.use-case";
import { loadPublicSurveyPageUseCase } from "@/features/public-form/use-cases/load-public-survey-page.use-case";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { getSubmissionByAccessTokenUseCase } from "@/features/public-submissions/edit/get-submission-by-access-token.use-case";
import { ApiResult, type Submission } from "@/lib/endatix-api";
import { PersonalizationSource } from "@/lib/endatix-api/submissions/types";
import { Result } from "@/lib/result";
import type { ActiveDefinition } from "@/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "@/features/public-form/use-cases/get-active-definition.use-case",
  () => ({ getActiveDefinitionUseCase: vi.fn() }),
);
vi.mock(
  "@/features/public-form/use-cases/get-partial-submission.use-case",
  () => ({ getPartialSubmissionUseCase: vi.fn() }),
);
vi.mock(
  "@/features/public-form/use-cases/get-public-form-access.use-case",
  () => ({ getPublicFormAccessUseCase: vi.fn() }),
);
vi.mock(
  "@/features/public-submissions/edit/get-submission-by-access-token.use-case",
  () => ({ getSubmissionByAccessTokenUseCase: vi.fn() }),
);
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/feature-flags", () => ({
  personalizationFlag: vi.fn(async () => true),
}));
vi.mock("@/features/auth/authorization", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth/authorization")>()),
  authorization: vi.fn(),
}));

/** The signed-in viewer may test forms, or not; a tester may also edit forms, or not. */
function viewerMayTest(allowed: boolean, canEdit = true) {
  vi.mocked(auth).mockResolvedValue({ accessToken: "token" } as never);
  vi.mocked(authorization).mockResolvedValue({
    checkAllPermissions: vi.fn(async () => ({ success: allowed })),
    checkPermission: vi.fn(async () => ({ success: canEdit })),
  } as never);
}

const formId = "form-1";
const tokenStore = { getToken: () => Result.error("none") } as never;
const createdAt = new Date("2026-10-19T00:00:00.000Z");

const cookieSubmission: Submission = {
  id: "submission-21",
  createdAt,
  modifiedAt: createdAt,
  formId,
  formDefinitionId: "definition-1",
  isComplete: false,
  jsonData: "{}",
  currentPage: 0,
  metadata: "{}",
  token: "submission-token",
  status: "draft",
};

const personTestSubmission: Submission = {
  ...cookieSubmission,
  isTestSubmission: true,
  personalization: {
    identifier: "tester@example.com",
    capturedAt: createdAt.toISOString(),
    variables: {},
    source: PersonalizationSource.Test,
  },
};

/** A URL-token page reads the definition from its submission. */
const formDefinition = {
  id: "definition-1",
  formId,
  jsonData: "{}",
} as Submission["formDefinition"];

describe("loadPublicSurveyPageUseCase on a person's test submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // A public form: the API never reports test mode for it.
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.success({
        formId,
        submissionId: null,
        formPermissions: [],
        submissionPermissions: [],
        limitOnePerUser: false,
        hasUserSubmitted: false,
        canStartNewSubmission: true,
        isRespondentTestMode: false,
        cachedAt: createdAt.toISOString(),
        expiresAt: createdAt.toISOString(),
        eTag: "etag",
      }),
    );
    vi.mocked(getActiveDefinitionUseCase).mockResolvedValue(
      Result.success({ id: "definition-1" } as ActiveDefinition),
    );
  });

  it("gives a viewer with forms.test the Test inspector with Start over, even when the API says no test mode", async () => {
    vi.mocked(getPartialSubmissionUseCase).mockResolvedValue(
      ApiResult.success(personTestSubmission),
    );
    viewerMayTest(true);

    const result = await loadPublicSurveyPageUseCase({ formId, tokenStore });

    expect(result.kind === "success" && result.testInspector).toMatchObject({
      formId,
      submissionId: "submission-21",
      canStartOver: true,
      submitter: { identifier: "tester@example.com" },
    });
  });

  it("points a tester who may not edit forms at Audience, not the participant page that would send them away", async () => {
    vi.mocked(getPartialSubmissionUseCase).mockResolvedValue(
      ApiResult.success(personTestSubmission),
    );
    viewerMayTest(true, false);

    const result = await loadPublicSurveyPageUseCase({ formId, tokenStore });

    expect(
      result.kind === "success" && result.testInspector?.links.participant,
    ).toEqual({ label: "Audience", href: "/forms/form-1/audience?test=test" });
  });

  it("gives any other viewer of a test submission no view, so the page shows only the notice", async () => {
    vi.mocked(getPartialSubmissionUseCase).mockResolvedValue(
      ApiResult.success(personTestSubmission),
    );
    viewerMayTest(false);

    const result = await loadPublicSurveyPageUseCase({ formId, tokenStore });

    expect(result.kind === "success" && result.testInspector).toBeNull();
  });

  it("never calls auth() for a real respondent", async () => {
    vi.mocked(getPartialSubmissionUseCase).mockResolvedValue(
      ApiResult.success(cookieSubmission),
    );

    const result = await loadPublicSurveyPageUseCase({ formId, tokenStore });

    expect(result.kind === "success" && result.testInspector).toBeNull();
    expect(auth).not.toHaveBeenCalled();
    expect(authorization).not.toHaveBeenCalled();
  });

  it("never calls auth() for a real respondent on a URL-token page", async () => {
    vi.mocked(getSubmissionByAccessTokenUseCase).mockResolvedValue(
      Result.success({ ...cookieSubmission, formDefinition }),
    );

    await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
      urlToken: "access-token",
    });

    expect(auth).not.toHaveBeenCalled();
  });

  it("does not offer Start over on a URL-token test page, which ignores the cookie", async () => {
    vi.mocked(getSubmissionByAccessTokenUseCase).mockResolvedValue(
      Result.success({ ...personTestSubmission, formDefinition }),
    );
    viewerMayTest(true);

    const result = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
      urlToken: "access-token",
    });

    expect(auth).toHaveBeenCalledTimes(1);
    expect(result.kind === "success" && result.testInspector).toMatchObject({
      canStartOver: false,
    });
  });
});
