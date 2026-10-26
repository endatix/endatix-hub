import { submitFormOperation } from "@/features/public-form/application/submit-form-operation";
import { ApiResult, ERROR_CODE } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateByAccessToken, create, captureException } = vi.hoisted(() => ({
  updateByAccessToken: vi.fn(),
  create: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@/lib/endatix-api", async () => {
  const actual = await vi.importActual("@/lib/endatix-api");
  return {
    ...actual,
    EndatixApi: vi.fn().mockImplementation(function () {
      return { submissions: { public: { updateByAccessToken, create } } };
    }),
  };
});

vi.mock("@/features/analytics/posthog/server/node-client", () => ({
  getPostHog: () => ({ captureException }),
}));

vi.mock("@/features/auth", () => ({
  getSession: vi.fn().mockResolvedValue({}),
}));

const LINK_TOKEN = "submission-123.1893456000.s.stamp~sig";
const draft = { jsonData: '{"test": true}', isComplete: false };
const tokenStore = {
  getToken: vi.fn(),
  setToken: vi.fn(),
  deleteToken: vi.fn(),
};

describe("submitFormOperation with a personalized link's cookie access token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStore.getToken.mockReturnValue(Result.success(LINK_TOKEN));
  });

  it("keeps the access token when the update response carries a submission token", async () => {
    updateByAccessToken.mockResolvedValue(
      ApiResult.success({
        isComplete: false,
        id: "submission-123",
        token: "opaque-submission-token",
      }),
    );

    const result = await submitFormOperation(
      "form-1",
      draft,
      tokenStore as never,
    );

    expect(updateByAccessToken).toHaveBeenCalledWith(
      "form-1",
      LINK_TOKEN,
      draft,
    );
    expect(tokenStore.setToken).toHaveBeenCalledWith({
      formId: "form-1",
      token: LINK_TOKEN,
    });
    expect(ApiResult.isSuccess(result)).toBe(true);
  });

  it.each([
    [ERROR_CODE.TOKEN_EXPIRED, "This link has expired."],
    [ERROR_CODE.TOKEN_REVOKED, "This link is no longer valid."],
  ])(
    "refuses a save by a %s token with respondent copy, keeps the token, and starts no submission",
    async (errorCode, message) => {
      updateByAccessToken.mockResolvedValue(
        ApiResult.validationError("Token refused", errorCode),
      );

      const result = await submitFormOperation(
        "form-1",
        draft,
        tokenStore as never,
      );

      expect(ApiResult.isError(result) && result.error).toMatchObject({
        message,
        errorCode,
      });
      expect(create).not.toHaveBeenCalled();
      expect(tokenStore.deleteToken).not.toHaveBeenCalled();
      expect(captureException).toHaveBeenCalled();
      expect(JSON.stringify(captureException.mock.calls)).not.toContain(
        "stamp~sig",
      );
    },
  );

  it("gives a URL token's refused save the same respondent copy", async () => {
    updateByAccessToken.mockResolvedValue(
      ApiResult.validationError("Token expired", ERROR_CODE.TOKEN_EXPIRED),
    );

    const result = await submitFormOperation(
      "form-1",
      draft,
      tokenStore as never,
      LINK_TOKEN,
    );

    expect(ApiResult.isError(result) && result.error.message).toBe(
      "This link has expired.",
    );
    expect(create).not.toHaveBeenCalled();
  });
});
