import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicFormPermissions } from "../../domain/public-form-permissions";
import { ApiResult } from "@/lib/endatix-api";
import { Result } from "@/lib/result";

const { Form, Submission } = PublicFormPermissions;

const {
  mockGet,
  mockGetPublicFormAccess,
  mockGetByToken,
  mockGetByAccessToken,
} = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockGetPublicFormAccess: vi.fn(),
  mockGetByToken: vi.fn(),
  mockGetByAccessToken: vi.fn(),
}));

vi.mock("@/lib/endatix-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/endatix-api")>();
  class MockEndatixApi {
    get = mockGet;
    forms = { getPublicFormAccess: mockGetPublicFormAccess };
    submissions = {
      public: {
        getByToken: mockGetByToken,
        getByAccessToken: mockGetByAccessToken,
      },
    };
  }
  return {
    ...actual,
    EndatixApi: MockEndatixApi,
  };
});

import { authorizeFormStorageAccess } from "../authorize-form-storage-access";

describe("authorizeFormStorageAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows public forms via anonymous definition", async () => {
    mockGet.mockResolvedValue(ApiResult.success({}));

    const result = await authorizeFormStorageAccess({ formId: "100" });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.isPublicForm).toBe(true);
      expect(result.value.canViewFiles).toBe(true);
    }
    expect(mockGetPublicFormAccess).not.toHaveBeenCalled();
  });

  it("denies private form without session when definition fails", async () => {
    mockGet.mockResolvedValue(
      ApiResult.authError("Forbidden", "FORBIDDEN", { statusCode: 403 }),
    );

    const result = await authorizeFormStorageAccess({ formId: "100" });

    expect(Result.isError(result)).toBe(true);
    expect(mockGetPublicFormAccess).not.toHaveBeenCalled();
  });

  it("uses hub policy when definition fails and hub session is present", async () => {
    mockGet.mockResolvedValue(
      ApiResult.authError("Forbidden", "FORBIDDEN", { statusCode: 403 }),
    );
    mockGetPublicFormAccess.mockResolvedValue(
      ApiResult.success({
        formId: "100",
        submissionId: null,
        formPermissions: [Form.View, Form.FileView],
        submissionPermissions: [Submission.Create, Submission.FileUpload],
        cachedAt: "",
        expiresAt: "",
        eTag: "e1",
      }),
    );

    const result = await authorizeFormStorageAccess(
      { formId: "100" },
      { hubAccessToken: "hub-jwt" },
    );

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.canViewFiles).toBe(true);
      expect(result.value.isPublicForm).toBe(false);
    }
    expect(mockGetPublicFormAccess).toHaveBeenCalledWith("100", {}, true);
  });

  it("allows file delete for logged-in submitter with file upload policy", async () => {
    mockGet.mockResolvedValue(
      ApiResult.authError("Forbidden", "access_forbidden", { statusCode: 403 }),
    );
    mockGetPublicFormAccess.mockResolvedValue(
      ApiResult.success({
        formId: "100",
        submissionId: "200",
        formPermissions: [Form.View],
        submissionPermissions: [Submission.FileUpload],
        cachedAt: "",
        expiresAt: "",
        eTag: "e1",
      }),
    );

    const result = await authorizeFormStorageAccess(
      { formId: "100", submissionId: "200" },
      { hubAccessToken: "hub-jwt" },
    );

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.canUploadFiles).toBe(true);
      expect(result.value.canDeleteFiles).toBe(true);
      expect(result.value.submissionId).toBe("200");
    }
  });

  it("prefers hub policy over anonymous public form for file delete", async () => {
    mockGet.mockResolvedValue(ApiResult.success({}));
    mockGetPublicFormAccess.mockResolvedValue(
      ApiResult.success({
        formId: "100",
        submissionId: "200",
        formPermissions: [Form.FileDelete],
        submissionPermissions: [Submission.FileDelete],
        cachedAt: "",
        expiresAt: "",
        eTag: "e1",
      }),
    );

    const result = await authorizeFormStorageAccess(
      { formId: "100", submissionId: "200" },
      { hubAccessToken: "hub-jwt" },
    );

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.canDeleteFiles).toBe(true);
      expect(result.value.isPublicForm).toBe(false);
    }
    expect(mockGetPublicFormAccess).toHaveBeenCalled();
  });

  it("uses submission token path without policy call", async () => {
    mockGetByToken.mockResolvedValue(ApiResult.success({ id: "200" }));

    const result = await authorizeFormStorageAccess({
      formId: "100",
      token: "sub-token",
      tokenType: "SubmissionToken",
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.submissionId).toBe("200");
    }
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockGetPublicFormAccess).not.toHaveBeenCalled();
  });
});
