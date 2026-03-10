import SettingsOrganizationUsersPage from "@/app/(main)/settings/organization/users/page";
import * as authModule from "@/auth";
import * as authFeature from "@/features/auth/authorization";
import { Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn(),
  Permissions: { Tenant: { ViewUsers: "tenant.users.view" } },
}));

vi.mock("@/lib/endatix-api", async () => {
  const { createEndatixApiMock } =
    await import("@/__tests__/utils/mock-endatix-api");
  return createEndatixApiMock();
});

vi.mock("@/features/organization/view-users/ui/users-table", () => ({
  UsersTable: ({
    usersPromise,
    currentUserId,
  }: {
    usersPromise: Promise<unknown[]>;
    currentUserId?: string;
  }) => (
    <div data-testid="users-table">
      <span data-testid="current-user-id">{currentUserId ?? "none"}</span>
    </div>
  ),
}));

describe("Settings organization users page", () => {
  const mockRequireHubAccess = vi.fn().mockResolvedValue(undefined);
  const mockRequirePermission = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
      accessToken: "token",
    } as unknown as Awaited<ReturnType<typeof authModule.auth>>);
    vi.mocked(authFeature.authorization).mockResolvedValue({
      requireHubAccess: mockRequireHubAccess,
      requirePermission: mockRequirePermission,
    } as unknown as Awaited<ReturnType<typeof authFeature.authorization>>);
  });

  it("calls auth and authorization", async () => {
    await SettingsOrganizationUsersPage();

    expect(authModule.auth).toHaveBeenCalled();
    expect(authFeature.authorization).toHaveBeenCalled();
  });

  it("calls requireHubAccess", async () => {
    await SettingsOrganizationUsersPage();

    expect(mockRequireHubAccess).toHaveBeenCalled();
  });

  it("calls requirePermission with Tenant.ViewUsers when fetching users", async () => {
    await SettingsOrganizationUsersPage();

    expect(mockRequirePermission).toHaveBeenCalledWith(
      Permissions.Tenant.ViewUsers,
    );
  });

  it("renders page heading and description", async () => {
    const component = await SettingsOrganizationUsersPage();
    await act(async () => {
      render(component);
    });

    expect(screen.getByRole("heading", { name: "Users" })).toBeDefined();
    expect(screen.getByText("People in your organization.")).toBeDefined();
  });

  it("renders users table", async () => {
    const component = await SettingsOrganizationUsersPage();
    await act(async () => {
      render(component);
    });

    expect(screen.getByTestId("users-table")).toBeDefined();
  });
});
