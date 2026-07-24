import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { deleteSubmissionAction } from "../delete-submission.action";

const mockRequireHubAccess = vi.fn();
const mockDelete = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ accessToken: "token" }),
}));

vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn().mockResolvedValue({
    requireHubAccess: (...args: unknown[]) => mockRequireHubAccess(...args),
  }),
}));

vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: vi.fn().mockImplementation(function () {
    return {
      submissions: {
        delete: (...args: unknown[]) => mockDelete(...args),
      },
    };
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

describe("deleteSubmissionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireHubAccess.mockResolvedValue(undefined);
  });

  it("deletes via API and revalidates list, details, and form paths", async () => {
    mockDelete.mockResolvedValueOnce(ApiResult.success("sub-1"));

    const result = await deleteSubmissionAction("form-1", "sub-1");

    expect(mockRequireHubAccess).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledWith("form-1", "sub-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/(main)/forms/form-1/submissions",
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/(main)/forms/form-1/submissions/sub-1",
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/(main)/forms/form-1");
    expect(Result.isSuccess(result)).toBe(true);
    expect(result.value).toBe("sub-1");
  });

  it("maps API failures without revalidating", async () => {
    mockDelete.mockResolvedValueOnce(
      ApiResult.serverError("Failed to delete submission"),
    );

    const result = await deleteSubmissionAction("form-1", "sub-1");

    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(Result.isError(result)).toBe(true);
  });
});
