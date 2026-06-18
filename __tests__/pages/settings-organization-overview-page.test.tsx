import OrganizationOverviewPage from "@/app/(main)/settings/organization/overview/page";
import * as authModule from "@/auth";
import * as authFeature from "@/features/auth/authorization";
import { Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { storageStatsFlag } from "@/lib/feature-flags/flags";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn(),
  Permissions: {
    Tenant: {
      ViewSettings: "tenant.settings.view",
    },
  },
}));

vi.mock("@/lib/feature-flags/flags", () => ({
  storageStatsFlag: vi.fn(),
}));

vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: vi.fn(),
}));

vi.mock("@/features/organization/view-storage-stats", () => ({
  StorageDashboard: () => <div data-testid="storage-dashboard" />,
}));

describe("Settings organization overview page", () => {
  const mockRequireHubAccess = vi.fn().mockResolvedValue(undefined);
  const mockCheckPermission = vi.fn();
  const mockGetStorageStats = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageStatsFlag).mockResolvedValue(true);
    vi.mocked(authModule.auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
      accessToken: "token",
    } as unknown as Awaited<ReturnType<typeof authModule.auth>>);
    vi.mocked(authFeature.authorization).mockResolvedValue({
      requireHubAccess: mockRequireHubAccess,
      checkPermission: mockCheckPermission,
    } as unknown as Awaited<ReturnType<typeof authFeature.authorization>>);
    mockCheckPermission.mockResolvedValue({ success: true });
    mockGetStorageStats.mockResolvedValue({ success: true, data: {} });
    vi.mocked(EndatixApi).mockImplementation(function () {
      return {
        stats: {
          getStorageStats: mockGetStorageStats,
        },
      } as unknown as EndatixApi;
    });
  });

  it("requires hub access and tenant settings view permission", async () => {
    await OrganizationOverviewPage();

    expect(mockRequireHubAccess).toHaveBeenCalled();
    expect(mockCheckPermission).toHaveBeenCalledWith(
      Permissions.Tenant.ViewSettings,
    );
  });

  it("loads storage stats with the signed-in user's token", async () => {
    await OrganizationOverviewPage();

    expect(EndatixApi).toHaveBeenCalledWith("token");
    expect(mockGetStorageStats).toHaveBeenCalled();
  });

  it("renders the organization overview page", async () => {
    const component = await OrganizationOverviewPage();
    render(component);

    expect(screen.getByRole("heading", { name: "Overview" })).toBeDefined();
    expect(screen.getByTestId("storage-dashboard")).toBeDefined();
  });
});
