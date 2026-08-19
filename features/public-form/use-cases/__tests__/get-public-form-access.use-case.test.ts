import { getPublicFormAccessUseCase } from "@/features/public-form/use-cases/get-public-form-access.use-case";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
import { Result } from "@/lib/result";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getPublicFormAccess } = vi.hoisted(() => ({
  auth: vi.fn(),
  getPublicFormAccess: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth,
}));

vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: vi.fn().mockImplementation(function () {
    return {
      forms: {
        getPublicFormAccess,
      },
    };
  }),
}));

const publicAccess = {
  formId: "form-1",
  submissionId: null,
  formPermissions: [],
  submissionPermissions: [],
  limitOnePerUser: false,
  hasUserSubmitted: false,
  canStartNewSubmission: true,
  isRespondentTestMode: false,
  cachedAt: "2026-08-19T00:00:00.000Z",
  expiresAt: "2026-08-19T00:00:00.000Z",
  eTag: "etag",
};

describe("getPublicFormAccessUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue(null);
  });

  it("returns access data on success", async () => {
    getPublicFormAccess.mockResolvedValue(ApiResult.success(publicAccess));

    const result = await getPublicFormAccessUseCase({ formId: "form-1" });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual(publicAccess);
    }
    expect(getPublicFormAccess).toHaveBeenCalledWith("form-1", {}, false);
  });

  it("preserves authentication_required for anonymous private-form access", async () => {
    getPublicFormAccess.mockResolvedValue(
      ApiResult.authError("You must be authenticated to access this form"),
    );

    const result = await getPublicFormAccessUseCase({ formId: "form-1" });

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorCode).toBe(ERROR_CODE.AUTHENTICATION_REQUIRED);
    }
  });

  it("preserves access_forbidden when the user cannot access a private form", async () => {
    getPublicFormAccess.mockResolvedValue(
      ApiResult.forbiddenError("You are not allowed to access this form"),
    );

    const result = await getPublicFormAccessUseCase({ formId: "form-1" });

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorCode).toBe(ERROR_CODE.ACCESS_FORBIDDEN);
    }
  });
});
