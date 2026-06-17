import type { Session } from "next-auth";
import { authorization } from "@/features/auth/authorization";
import type { INavItem } from "@/types/navigation-models";
import { filterNavByAuth, type NavigationAuthData } from "./filter-nav-by-auth";

/**
 * Filters the navigation items by the current user.
 * @param items - The navigation items to filter.
 * @param session - The session to filter the navigation items by.
 * @returns The filtered navigation items.
 */
export async function filterNavByCurrentUser(
  items: readonly INavItem[],
  session: Session | null,
): Promise<INavItem[]> {
  if (!session) {
    return filterNavByAuth(items, null);
  }

  const authService = await authorization(session);
  const authDataResult = await authService.getAuthorizationData();
  if (!authDataResult.success) {
    return filterNavByAuth(items, null);
  }

  const authData: NavigationAuthData = {
    roles: authDataResult.data.roles,
    permissions: authDataResult.data.permissions,
    isAdmin: authDataResult.data.isAdmin,
  };

  return filterNavByAuth(items, authData);
}
