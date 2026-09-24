import { SystemRoles } from "@/features/auth/authorization/domain/system-roles";

/** PlatformAdmin is granted on the platform page, never from a tenant's users list. */
export function isPlatformScopedRole(roleName: string) {
  return roleName.toLowerCase() === SystemRoles.PlatformAdmin.toLowerCase();
}
