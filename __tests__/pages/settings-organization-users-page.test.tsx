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
  Permissions: {
    Tenant: {
      InviteUsers: "tenant.users.invite",
      ManageUsers: "tenant.users.manage",
      ManageRoles: "tenant.roles.manage",
      ViewRoles: "tenant.roles.view",
      ViewUsers: "tenant.users.view",
    },
  },
}));

vi.mock("@/lib/endatix-api", async () => {
  const { createEndatixApiMock } =
    await import("@/__tests__/utils/mock-endatix-api");
  return createEndatixApiMock();
});

vi.mock("@/features/organization/user-management/ui/users-table", () => ({
  UsersTable: ({
    currentUserId,
    canManageRoles,
    canManageUsers,
  }: {
    usersPromise: Promise<unknown[]>;
    currentUserId?: string;
    canManageRoles?: boolean;
    canManageUsers?: boolean;
  }) => (
    <div data-testid="users-table">
      <span data-testid="current-user-id">{currentUserId ?? "none"}</span>
      <span data-testid="can-manage-roles">{String(canManageRoles)}</span>
      <span data-testid="can-manage-users">{String(canManageUsers)}</span>
    </div>
  ),
}));

describe("Settings organization users page", () => {
  const mockRequireHubAccess = vi.fn().mockResolvedValue(undefined);
  const mockRequirePermission = vi.fn().mockResolvedValue(undefined);
  const mockEvaluatePermissions = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
      accessToken: "token",
    } as unknown as Awaited<ReturnType<typeof authModule.auth>>);
    vi.mocked(authFeature.authorization).mockResolvedValue({
      requireHubAccess: mockRequireHubAccess,
      requirePermission: mockRequirePermission,
      evaluatePermissions: mockEvaluatePermissions,
    } as unknown as Awaited<ReturnType<typeof authFeature.authorization>>);
    mockEvaluatePermissions.mockResolvedValue({
      success: true,
      data: {
        [Permissions.Tenant.ViewUsers]: true,
        [Permissions.Tenant.InviteUsers]: true,
        [Permissions.Tenant.ManageRoles]: true,
        [Permissions.Tenant.ManageUsers]: true,
        [Permissions.Tenant.ViewRoles]: true,
      },
    });
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

    expect(
      screen.getByRole("heading", { name: "Users Directory" }),
    ).toBeDefined();
    expect(
      screen.getByText(
        "Invite users, manage roles, and control access for your organization.",
      ),
    ).toBeDefined();
  });

  it("renders users table", async () => {
    const component = await SettingsOrganizationUsersPage();
    await act(async () => {
      render(component);
    });

    expect(screen.getByTestId("users-table")).toBeDefined();
  });

  it("renders for users with ViewUsers even when ManageUsers is missing", async () => {
    mockEvaluatePermissions.mockResolvedValue({
      success: true,
      data: {
        [Permissions.Tenant.ViewUsers]: true,
        [Permissions.Tenant.InviteUsers]: false,
        [Permissions.Tenant.ManageRoles]: true,
        [Permissions.Tenant.ManageUsers]: false,
        [Permissions.Tenant.ViewRoles]: false,
      },
    });

    const component = await SettingsOrganizationUsersPage();
    await act(async () => {
      render(component);
    });

    expect(screen.getByTestId("users-table")).toBeDefined();
    expect(screen.getByTestId("can-manage-roles").textContent).toBe("true");
    expect(screen.getByTestId("can-manage-users").textContent).toBe("false");
  });
});
