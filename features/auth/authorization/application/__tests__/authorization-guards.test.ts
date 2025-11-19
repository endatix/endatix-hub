import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requirePermissionFactory,
  requireAnyPermissionFactory,
  requireAllPermissionsFactory,
  requireHubAccessFactory,
  requireAdminAccessFactory,
  requireRoleFactory,
  requirePlatformAdminFactory,
} from "../authorization-guards";
import { AuthorizationResult } from "../../domain/authorization-result";
import { Permissions } from "../../domain/permissions";
import { SystemRoles } from "../../domain/system-roles";
import { handlePermissionError } from "../error-handler";

const successResult = AuthorizationResult.success();
const forbiddenResult = AuthorizationResult.forbidden();

vi.mock("../error-handler", () => ({
  handlePermissionError: vi.fn(),
}));

describe("authorization-guards", () => {
  const mockedHandlePermissionError = vi.mocked(handlePermissionError);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requirePermission calls checker with provided permission", async () => {
    const checkPermission = vi.fn().mockResolvedValue(successResult);
    const requirePermission = requirePermissionFactory(checkPermission);

    await requirePermission("forms.read");

    expect(checkPermission).toHaveBeenCalledWith("forms.read");
    expect(handlePermissionError).not.toHaveBeenCalled();
  });

  it("requirePermission delegates errors to handler", async () => {
    mockedHandlePermissionError.mockImplementation(() => {
      throw new Error("redirect");
    });
    const checkPermission = vi.fn().mockResolvedValue(forbiddenResult);
    const requirePermission = requirePermissionFactory(checkPermission);

    await expect(requirePermission("forms.read")).rejects.toThrow();
  });

  it("requireAnyPermission delegates to checker", async () => {
    const checkAnyPermission = vi.fn().mockResolvedValue(successResult);
    const requireAnyPermission =
      requireAnyPermissionFactory(checkAnyPermission);

    await requireAnyPermission(["forms.read", "forms.create"]);

    expect(checkAnyPermission).toHaveBeenCalledWith([
      "forms.read",
      "forms.create",
    ]);
    expect(handlePermissionError).not.toHaveBeenCalled();
  });

  it("requireAllPermissions forwards results", async () => {
    mockedHandlePermissionError.mockImplementation(() => {
      throw new Error("redirect");
    });
    const checkAllPermissions = vi.fn().mockResolvedValue(forbiddenResult);
    const requireAllPermissions =
      requireAllPermissionsFactory(checkAllPermissions);

    await expect(
      requireAllPermissions(["forms.read", "forms.create"]),
    ).rejects.toThrow();
  });

  it("requireHubAccess checks hub access permission", async () => {
    const checkPermission = vi.fn().mockResolvedValue(successResult);
    const requireHubAccess = requireHubAccessFactory(checkPermission);

    await requireHubAccess();

    expect(checkPermission).toHaveBeenCalledWith(Permissions.Access.Hub);
  });

  it("requireAdminAccess uses admin checker", async () => {
    const checkIsAdmin = vi.fn().mockResolvedValue(successResult);
    const requireAdminAccess = requireAdminAccessFactory(checkIsAdmin);

    await requireAdminAccess();

    expect(checkIsAdmin).toHaveBeenCalled();
  });

  it("requireRole checks provided role", async () => {
    const checkIsInRole = vi.fn().mockResolvedValue(successResult);
    const requireRole = requireRoleFactory(checkIsInRole);

    await requireRole("Admin");

    expect(checkIsInRole).toHaveBeenCalledWith("Admin");
  });

  it("requirePlatformAdmin checks platform admin role", async () => {
    const checkIsInRole = vi.fn().mockResolvedValue(successResult);
    const requirePlatformAdmin = requirePlatformAdminFactory(checkIsInRole);

    await requirePlatformAdmin();

    expect(checkIsInRole).toHaveBeenCalledWith(SystemRoles.PlatformAdmin);
  });
});
