import { SystemRoles } from "@/features/auth/authorization/domain/system-roles";
import {
  getRolePermissionSummary,
  isAssignablePermissionName,
} from "../role-permission-summary";
import { describe, expect, it } from "vitest";

describe("getRolePermissionSummary", () => {
  it("summarizes tenant admin roles as all tenant permissions", () => {
    const summary = getRolePermissionSummary({
      name: SystemRoles.Admin,
      permissions: ["access.hub", "tenant.manage-users"],
    });

    expect(summary).toEqual({
      kind: "effective-access",
      label: "All tenant permissions",
    });
  });

  it("summarizes platform admin roles as all platform permissions", () => {
    const summary = getRolePermissionSummary({
      name: SystemRoles.PlatformAdmin,
      permissions: [],
    });

    expect(summary).toEqual({
      kind: "effective-access",
      label: "All platform permissions",
    });
  });

  it("keeps explicit permission counts for normal roles", () => {
    const summary = getRolePermissionSummary({
      name: SystemRoles.Creator,
      permissions: ["forms.view", "forms.create"],
    });

    expect(summary).toEqual({
      kind: "permission-count",
      count: 2,
      label: "2 permissions",
    });
  });

  it("excludes pseudo permissions from normal role counts", () => {
    const summary = getRolePermissionSummary({
      name: "Reviewer",
      permissions: ["access.authenticated", "forms.view"],
    });

    expect(summary).toEqual({
      kind: "permission-count",
      count: 1,
      label: "1 permission",
    });
  });
});

describe("isAssignablePermissionName", () => {
  it("treats authenticated access as a pseudo permission", () => {
    expect(isAssignablePermissionName("access.authenticated")).toBe(false);
    expect(isAssignablePermissionName("forms.view")).toBe(true);
  });
});
