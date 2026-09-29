import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import type { NormalizedPagedResponse } from "@/lib/endatix-api/shared/paged-response";
import { listSignupRequests } from "../../list-signup-requests/list-signup-requests.server";
import { requirePlatformAdmin } from "../../server";
import { saasManagementFlag } from "@/lib/feature-flags/flags";
import { refreshSignupRequestAction } from "../review-signup-request.actions";
import type { SignupRequestView } from "../types";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/feature-flags/flags", () => ({
  saasManagementFlag: vi.fn(),
}));
vi.mock("../../server", () => ({ requirePlatformAdmin: vi.fn() }));
vi.mock("../../list-signup-requests/list-signup-requests.server", () => ({
  listSignupRequests: vi.fn(),
}));

function page(
  items: SignupRequestView[],
  hasNextPage: boolean,
): NormalizedPagedResponse<SignupRequestView> {
  return {
    page: 1,
    pageSize: 20,
    totalRecords: items.length,
    totalPages: hasNextPage ? 2 : 1,
    items,
    hasNextPage,
  };
}

function row(id: string): SignupRequestView {
  return {
    id,
    email: "prospect@example.com",
    companyName: null,
    status: "approved",
    provisioningStatus: "succeeded",
    rejectionComment: null,
    tenantName: "Acme",
    approvedTenantId: "900",
    decidedByUserId: null,
    createdAt: "2026-01-15T10:00:00.000Z",
    modifiedAt: null,
    visitor: null,
  };
}

describe("refreshSignupRequestAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saasManagementFlag).mockResolvedValue(true);
    vi.mocked(requirePlatformAdmin).mockResolvedValue({
      accessToken: "token",
    } as never);
  });

  it("reads the next page when the request is not on the first", async () => {
    // Arrange
    vi.mocked(listSignupRequests)
      .mockResolvedValueOnce(Result.success(page([row("other")], true)))
      .mockResolvedValueOnce(Result.success(page([row("1")], false)));

    // Act
    const result = await refreshSignupRequestAction(
      "1",
      "prospect@example.com",
    );

    // Assert
    expect(Result.isSuccess(result) && result.value.id).toBe("1");
    expect(listSignupRequests).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        page: 2,
        status: "all",
        search: "prospect@example.com",
      }),
    );
  });

  it("reports the request missing when no page contains it", async () => {
    // Arrange
    vi.mocked(listSignupRequests).mockResolvedValue(
      Result.success(page([row("other")], false)),
    );

    // Act
    const result = await refreshSignupRequestAction(
      "1",
      "prospect@example.com",
    );

    // Assert
    expect(Result.isError(result) && result.message).toBe(
      "This request is no longer available.",
    );
    expect(listSignupRequests).toHaveBeenCalledOnce();
  });
});
