export const SystemRoles = {
  Admin: "Admin",
  Creator: "Creator",
  Authenticated: "Authenticated",
  Public: "Public",
  PlatformAdmin: "PlatformAdmin",
} as const;

export type SystemRole = (typeof SystemRoles)[keyof typeof SystemRoles];

export function isValidSystemRole(value: string): value is SystemRole {
  return Object.values(SystemRoles).includes(value as SystemRole);
}