import type { RoleTypeFilter } from "@/lib/endatix-api";

/** `?roleType=` as the roles page and its toolbar read it: trimmed, any case. */
export function parseRoleType(
  value: string | null | undefined,
): RoleTypeFilter | undefined {
  const normalizedValue = value?.trim().toLowerCase();
  if (
    normalizedValue === "all" ||
    normalizedValue === "system" ||
    normalizedValue === "custom"
  ) {
    return normalizedValue;
  }

  return undefined;
}
