import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api";
import { Result } from "@/lib/result";

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

import { runFormStorageGateStrategies } from "../run-gate-strategies";

describe("runFormStorageGateStrategies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(
      ApiResult.authError("Forbidden", "FORBIDDEN", { statusCode: 403 }),
    );
    mockGetPublicFormAccess.mockResolvedValue(
      ApiResult.authError("Forbidden", "FORBIDDEN", { statusCode: 403 }),
    );
    mockGetByToken.mockResolvedValue(
      ApiResult.authError("Forbidden", "FORBIDDEN", { statusCode: 403 }),
    );
    mockGetByAccessToken.mockResolvedValue(
      ApiResult.authError("Forbidden", "FORBIDDEN", { statusCode: 403 }),
    );
  });

  it("falls through hub policy failure to anonymous public form", async () => {
    mockGetPublicFormAccess.mockResolvedValue(
      ApiResult.authError("Forbidden", "FORBIDDEN", { statusCode: 403 }),
    );
    mockGet.mockResolvedValue(ApiResult.success({}));

    const result = await runFormStorageGateStrategies(
      { formId: "100" },
      { hubAccessToken: "hub-jwt" },
    );

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.isPublicForm).toBe(true);
    }
  });

  it("returns forbidden when all strategies fail", async () => {
    const result = await runFormStorageGateStrategies({ formId: "100" }, {});

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Form access denied");
    }
  });
});
