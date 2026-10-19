import { getActiveDefinitionUseCase } from "@/features/public-form/use-cases/get-active-definition.use-case";
import { getPartialSubmissionUseCase } from "@/features/public-form/use-cases/get-partial-submission.use-case";
import { getPublicFormAccessUseCase } from "@/features/public-form/use-cases/get-public-form-access.use-case";
import { loadPublicSurveyPageUseCase } from "@/features/public-form/use-cases/load-public-survey-page.use-case";
import { viewerCanTestFormsUseCase } from "@/features/public-form/use-cases/viewer-can-test-forms.use-case";
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
  "@/features/public-form/use-cases/viewer-can-test-forms.use-case",
  () => ({ viewerCanTestFormsUseCase: vi.fn() }),
);

const formId = "form-1";
const tokenStore = {} as never;
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

  it("lets a viewer with forms.test Start over, even when the API says no test mode", async () => {
    vi.mocked(getPartialSubmissionUseCase).mockResolvedValue(
      ApiResult.success(personTestSubmission),
    );
    vi.mocked(viewerCanTestFormsUseCase).mockResolvedValue(true);

    const result = await loadPublicSurveyPageUseCase({ formId, tokenStore });

    expect(result.kind === "success" && result.canStartOverTest).toBe(true);
  });

  it("does not check forms.test for a submission that is not a person's test submission", async () => {
    vi.mocked(getPartialSubmissionUseCase).mockResolvedValue(
      ApiResult.success(cookieSubmission),
    );

    const result = await loadPublicSurveyPageUseCase({ formId, tokenStore });

    expect(result.kind === "success" && result.canStartOverTest).toBe(false);
    expect(viewerCanTestFormsUseCase).not.toHaveBeenCalled();
  });
});
