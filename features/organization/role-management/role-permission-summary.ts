import { SystemRoles } from "@/features/auth/authorization/domain/system-roles";
import type { RoleListItem } from "@/lib/endatix-api";

export type RolePermissionSummary =
  | {
      kind: "effective-access";
      label: "All tenant permissions" | "All platform permissions";
    }
  | {
      kind: "permission-count";
      count: number;
      label: string;
    };

const pseudoPermissionNames = new Set(["access.authenticated"]);

export function getRolePermissionSummary(
  role: Pick<RoleListItem, "name" | "permissions">,
): RolePermissionSummary {
  if (isRoleNamed(role.name, SystemRoles.PlatformAdmin)) {
    return {
      kind: "effective-access",
      label: "All platform permissions",
    };
  }

  if (isRoleNamed(role.name, SystemRoles.Admin)) {
    return {
      kind: "effective-access",
      label: "All tenant permissions",
    };
  }

  const count = role.permissions.filter(isAssignablePermissionName).length;

  return {
    kind: "permission-count",
    count,
    label: `${count} ${count === 1 ? "permission" : "permissions"}`,
  };
}

export function isAssignablePermissionName(permissionName: string) {
  return !pseudoPermissionNames.has(permissionName.toLowerCase());
}

function isRoleNamed(roleName: string, systemRoleName: string) {
  return roleName.toLowerCase() === systemRoleName.toLowerCase();
}
