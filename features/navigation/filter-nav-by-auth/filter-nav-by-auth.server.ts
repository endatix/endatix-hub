import type { Session } from "next-auth";
import { cache } from "react";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { SitemapService } from "@/services/sitemap-service";
import type { INavItem } from "@/types/navigation-models";
import {
  filterNavByAuth,
  getNavItemKeys,
  type NavigationAuthData,
} from "./filter-nav-by-auth";

function hasUsableSession(session: Session | null): session is Session {
  return (
    session?.user?.id !== undefined &&
    session.accessToken !== undefined &&
    !session.error
  );
}

/**
 * Filters navigation by the current user's roles and permissions.
 * UX-only: route guards enforce access. On auth resolution failure, gated items are hidden.
 */
export async function filterNavByCurrentUser(
  items: readonly INavItem[],
  session: Session | null,
): Promise<INavItem[]> {
  if (!hasUsableSession(session)) {
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

/**
 * Request-memoized nav keys for the current session. Use from @nav server slots.
 */
export const getAuthorizedNavItemKeys = cache(async (): Promise<string[]> => {
  const session = await auth();
  const navItems = await filterNavByCurrentUser(
    SitemapService.getTopLevelSitemap(),
    session,
  );

  return getNavItemKeys(navItems);
});
