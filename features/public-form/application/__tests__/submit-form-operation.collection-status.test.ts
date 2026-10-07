import { submitFormOperation } from "@/features/public-form/application/submit-form-operation";
import { ApiResult } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateByToken } = vi.hoisted(() => ({ updateByToken: vi.fn() }));

vi.mock("@/lib/endatix-api", async () => {
  const actual = await vi.importActual("@/lib/endatix-api");
  return {
    ...actual,
    EndatixApi: vi.fn().mockImplementation(function () {
      return { submissions: { public: { updateByToken } } };
    }),
  };
});

vi.mock("@/features/auth", () => ({
  getSession: vi.fn().mockResolvedValue({}),
}));

const tokenStore = {
  getToken: vi.fn(),
  setToken: vi.fn(),
  deleteToken: vi.fn(),
};

function answerUpdateWith(collectionStatus: string) {
  updateByToken.mockResolvedValue(
    ApiResult.success({
      id: "submission-123",
      isComplete: false,
      collectionStatus,
      token: "existing-token",
    }),
  );
}

describe("submitFormOperation cookie and collection status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStore.getToken.mockReturnValue(Result.success("existing-token"));
  });

  it("deletes the cookie when a screen-out save is stored", async () => {
    // Arrange
    answerUpdateWith("screen_out");
    const screenOutData = {
      jsonData: '{"age": 16}',
      isComplete: false,
      currentPage: 0,
      collectionOutcome: "screen_out",
    };

    // Act
    const result = await submitFormOperation(
      "form-1",
      screenOutData,
      tokenStore as never,
    );

    // Assert
    expect(updateByToken).toHaveBeenCalledWith(
      "form-1",
      "existing-token",
      screenOutData,
    );
    expect(tokenStore.deleteToken).toHaveBeenCalledWith("form-1");
    expect(tokenStore.setToken).not.toHaveBeenCalled();
    expect(ApiResult.isSuccess(result)).toBe(true);
  });

  it.each([["quota_full"], ["cancelled"], ["custom_code"]])(
    "deletes the cookie when the server answers a partial save with %s",
    async (collectionStatus) => {
      // Arrange
      answerUpdateWith(collectionStatus);

      // Act
      await submitFormOperation(
        "form-1",
        { jsonData: "{}", isComplete: false, currentPage: 0 },
        tokenStore as never,
      );

      // Assert
      expect(tokenStore.deleteToken).toHaveBeenCalledWith("form-1");
      expect(tokenStore.setToken).not.toHaveBeenCalled();
    },
  );

  it("keeps the cookie while the submission stays open", async () => {
    // Arrange
    answerUpdateWith("in_progress");

    // Act
    await submitFormOperation(
      "form-1",
      { jsonData: "{}", isComplete: false, currentPage: 0 },
      tokenStore as never,
    );

    // Assert
    expect(tokenStore.setToken).toHaveBeenCalledWith({
      formId: "form-1",
      token: "existing-token",
    });
    expect(tokenStore.deleteToken).not.toHaveBeenCalled();
  });
});
