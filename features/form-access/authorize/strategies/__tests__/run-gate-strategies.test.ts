import { describe, expect, it, vi } from "vitest";
import { ApiResult, ERROR_CODE } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import type { FormAccessProvider } from "../../../infrastructure/form-access.provider";
import { runFormStorageGateStrategies } from "../run-gate-strategies";

function createMockProvider(
  overrides: Partial<FormAccessProvider> = {},
): FormAccessProvider {
  return {
    getAnonymousFormDefinition: vi
      .fn()
      .mockResolvedValue(
        ApiResult.authError("Forbidden", ERROR_CODE.ACCESS_FORBIDDEN),
      ),
    getPublicFormAccess: vi
      .fn()
      .mockResolvedValue(
        ApiResult.authError("Forbidden", ERROR_CODE.ACCESS_FORBIDDEN),
      ),
    getSubmissionByAccessToken: vi
      .fn()
      .mockResolvedValue(
        ApiResult.authError("Forbidden", ERROR_CODE.ACCESS_FORBIDDEN),
      ),
    getSubmissionByToken: vi
      .fn()
      .mockResolvedValue(
        ApiResult.authError("Forbidden", ERROR_CODE.ACCESS_FORBIDDEN),
      ),
    ...overrides,
  };
}

describe("runFormStorageGateStrategies", () => {
  it("falls through hub policy failure to anonymous public form", async () => {
    const formAccessProvider = createMockProvider({
      getPublicFormAccess: vi
        .fn()
        .mockResolvedValue(
          ApiResult.authError("Forbidden", ERROR_CODE.ACCESS_FORBIDDEN),
        ),
      getAnonymousFormDefinition: vi
        .fn()
        .mockResolvedValue(ApiResult.success({})),
    });

    const result = await runFormStorageGateStrategies(
      { formId: "100" },
      { hubAccessToken: "hub-jwt", formAccessProvider },
    );

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.isPublicForm).toBe(true);
    }
  });

  it("returns forbidden when all strategies fail", async () => {
    const result = await runFormStorageGateStrategies(
      { formId: "100" },
      { formAccessProvider: createMockProvider() },
    );

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Form access denied");
    }
  });
});
