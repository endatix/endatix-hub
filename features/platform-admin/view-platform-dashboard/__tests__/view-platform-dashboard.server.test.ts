import { beforeEach, describe, expect, it, vi } from "vitest";
import { saasManagementFlag } from "@/lib/feature-flags/flags";
import { Result } from "@/lib/result";
import { listPlatformTenants } from "../../list-tenants/list-tenants.server";
import { listPlatformAdminUsers } from "../../list-platform-admins/list-platform-admins.server";
import { listSignupRequests } from "../../list-signup-requests/list-signup-requests.server";
import type { PlatformAdminSession } from "../../types";
import { getPlatformDashboard } from "../view-platform-dashboard.server";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/feature-flags/flags", () => ({
  saasManagementFlag: vi.fn(),
}));
vi.mock("../../list-tenants/list-tenants.server", () => ({
  listPlatformTenants: vi.fn(),
}));
vi.mock("../../list-platform-admins/list-platform-admins.server", () => ({
  listPlatformAdminUsers: vi.fn(),
}));
vi.mock("../../list-signup-requests/list-signup-requests.server", () => ({
  listSignupRequests: vi.fn(),
}));

const session = { accessToken: "token" } as PlatformAdminSession;

function page(totalRecords: number) {
  return { items: [], totalRecords } as never;
}

describe("getPlatformDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listPlatformTenants).mockResolvedValue(Result.success(page(4)));
    vi.mocked(listPlatformAdminUsers).mockResolvedValue(page(2));
    vi.mocked(saasManagementFlag).mockResolvedValue(true);
  });

  it("omits signup requests when signup is off", async () => {
    // Arrange
    vi.mocked(saasManagementFlag).mockResolvedValue(false);

    // Act
    const dashboard = await getPlatformDashboard(session);

    // Assert
    expect(dashboard.signupRequests).toBeUndefined();
    expect(listSignupRequests).not.toHaveBeenCalled();
  });

  it("counts pending signup requests", async () => {
    // Arrange
    vi.mocked(listSignupRequests).mockResolvedValue(Result.success(page(3)));

    // Act
    const dashboard = await getPlatformDashboard(session);

    // Assert
    expect(listSignupRequests).toHaveBeenCalledWith(session, {
      page: 1,
      pageSize: 1,
      status: "pending",
    });
    expect(dashboard.signupRequests).toEqual({ pending: 3 });
  });

  it("hides the pending number instead of showing zero when the count fails", async () => {
    // Arrange
    vi.mocked(listSignupRequests).mockResolvedValue(
      Result.error("Failed to load signup requests."),
    );

    // Act
    const dashboard = await getPlatformDashboard(session);

    // Assert
    expect(dashboard.signupRequests).toEqual({ pending: undefined });
  });
});
