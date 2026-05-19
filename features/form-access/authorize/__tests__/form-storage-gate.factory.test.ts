import { describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import type { FormAccessProvider } from "../../infrastructure/form-access.provider";
import { createFormStorageGateService } from "../form-storage-gate.factory";

function createMockProvider(
  overrides: Partial<FormAccessProvider> = {},
): FormAccessProvider {
  return {
    getAnonymousFormDefinition: vi
      .fn()
      .mockResolvedValue(ApiResult.authError("Forbidden", "FORBIDDEN")),
    getPublicFormAccess: vi
      .fn()
      .mockResolvedValue(ApiResult.authError("Forbidden", "FORBIDDEN")),
    getSubmissionByAccessToken: vi
      .fn()
      .mockResolvedValue(ApiResult.authError("Forbidden", "FORBIDDEN")),
    getSubmissionByToken: vi
      .fn()
      .mockResolvedValue(ApiResult.authError("Forbidden", "FORBIDDEN")),
    ...overrides,
  };
}

describe("createFormStorageGateService", () => {
  it("authorizes public forms via anonymous definition", async () => {
    const formAccessProvider = createMockProvider({
      getAnonymousFormDefinition: vi
        .fn()
        .mockResolvedValue(ApiResult.success({})),
    });

    const service = createFormStorageGateService({ formAccessProvider });
    const result = await service.authorize({ formId: "100" });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.isPublicForm).toBe(true);
    }
    expect(formAccessProvider.getPublicFormAccess).not.toHaveBeenCalled();
  });

  it("uses hub policy when session token is provided", async () => {
    const formAccessProvider = createMockProvider({
      getAnonymousFormDefinition: vi
        .fn()
        .mockResolvedValue(ApiResult.authError("Forbidden", "FORBIDDEN")),
      getPublicFormAccess: vi.fn().mockResolvedValue(
        ApiResult.success({
          formId: "100",
          submissionId: null,
          formPermissions: ["form.file.view"],
          submissionPermissions: ["submission.file.upload"],
          cachedAt: "",
          expiresAt: "",
          eTag: "",
        }),
      ),
    });

    const service = createFormStorageGateService({
      hubAccessToken: "hub-jwt",
      formAccessProvider,
    });
    const result = await service.authorize({ formId: "100" });

    expect(Result.isSuccess(result)).toBe(true);
    expect(formAccessProvider.getPublicFormAccess).toHaveBeenCalledWith(
      "100",
      "hub-jwt",
    );
  });

  it("authorizes via submission token without policy call", async () => {
    const formAccessProvider = createMockProvider({
      getSubmissionByToken: vi
        .fn()
        .mockResolvedValue(ApiResult.success({ id: "200" })),
    });

    const service = createFormStorageGateService({ formAccessProvider });
    const result = await service.authorize({
      formId: "100",
      token: "sub-token",
      tokenType: "SubmissionToken",
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.submissionId).toBe("200");
    }
    expect(
      formAccessProvider.getAnonymousFormDefinition,
    ).not.toHaveBeenCalled();
    expect(formAccessProvider.getPublicFormAccess).not.toHaveBeenCalled();
  });
});
