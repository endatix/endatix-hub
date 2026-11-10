import { ANONYMOUS_SESSION } from "@/features/auth";
import { openSubmissionOperation } from "@/features/public-form/application/open-submission-operation";
import { ApiResult, ERROR_CODE } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { beforeEach, describe, expect, it, vi } from "vitest";

const open = vi.hoisted(() => vi.fn());

vi.mock("@/lib/endatix-api", async () => {
  const actual = await vi.importActual("@/lib/endatix-api");
  return {
    ...actual,
    EndatixApi: vi.fn().mockImplementation(function () {
      return { submissions: { public: { open } } };
    }),
  };
});

vi.mock("@/features/auth", async () => ({
  ANONYMOUS_SESSION: {},
  getSession: vi.fn().mockResolvedValue(() => ANONYMOUS_SESSION),
}));

const tokenStore = {
  getToken: vi.fn(),
  setToken: vi.fn(),
  deleteToken: vi.fn(),
};

const SUBMISSION_TOKEN = "a1b2c3d4e5f6";
const ACCESS_TOKEN = "42.1893456000.s.signature";
const viewed = {
  id: "42",
  token: SUBMISSION_TOKEN,
  isComplete: false,
  collectionStatus: "viewed",
};

describe("openSubmissionOperation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStore.getToken.mockReturnValue(Result.error("No token found"));
  });

  it("creates a submission on the first open and keeps its token in the cookie", async () => {
    open.mockResolvedValue(ApiResult.success(viewed));

    const result = await openSubmissionOperation("1", tokenStore as never);

    expect(open).toHaveBeenCalledWith("1", {});
    expect(tokenStore.setToken).toHaveBeenCalledWith({
      formId: "1",
      token: SUBMISSION_TOKEN,
    });
    expect(ApiResult.isSuccess(result) && result.data.submissionId).toBe("42");
  });

  it("resumes the cookie's submission by its token", async () => {
    tokenStore.getToken.mockReturnValue(Result.success(SUBMISSION_TOKEN));
    open.mockResolvedValue(ApiResult.success(viewed));

    await openSubmissionOperation("1", tokenStore as never);

    expect(open).toHaveBeenCalledWith("1", {
      submissionToken: SUBMISSION_TOKEN,
    });
  });

  it("resumes a personal link's submission by the access token in the cookie", async () => {
    tokenStore.getToken.mockReturnValue(Result.success(ACCESS_TOKEN));
    open.mockResolvedValue(ApiResult.success(viewed));

    await openSubmissionOperation("1", tokenStore as never);

    expect(open).toHaveBeenCalledWith("1", { accessToken: ACCESS_TOKEN });
    expect(tokenStore.setToken).not.toHaveBeenCalled();
  });

  it("opens a share link's submission by the URL token and leaves the cookie alone", async () => {
    tokenStore.getToken.mockReturnValue(Result.success(SUBMISSION_TOKEN));
    open.mockResolvedValue(ApiResult.success(viewed));

    await openSubmissionOperation("1", tokenStore as never, ACCESS_TOKEN);

    expect(open).toHaveBeenCalledWith("1", { accessToken: ACCESS_TOKEN });
    expect(tokenStore.setToken).not.toHaveBeenCalled();
    expect(tokenStore.deleteToken).not.toHaveBeenCalled();
  });

  it("starts over when the cookie's submission token is no longer valid", async () => {
    tokenStore.getToken.mockReturnValue(Result.success(SUBMISSION_TOKEN));
    open
      .mockResolvedValueOnce(
        ApiResult.validationError(
          "Invalid token",
          ERROR_CODE.SUBMISSION_TOKEN_INVALID,
        ),
      )
      .mockResolvedValueOnce(
        ApiResult.success({ ...viewed, id: "43", token: "f00d" }),
      );

    const result = await openSubmissionOperation("1", tokenStore as never);

    expect(tokenStore.deleteToken).toHaveBeenCalledWith("1");
    expect(open).toHaveBeenLastCalledWith("1", {});
    expect(tokenStore.setToken).toHaveBeenCalledWith({
      formId: "1",
      token: "f00d",
    });
    expect(ApiResult.isSuccess(result) && result.data.submissionId).toBe("43");
  });
});
