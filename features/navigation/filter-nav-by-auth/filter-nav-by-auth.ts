import type { INavItem } from "@/types/navigation-models";

export interface NavigationAuthData {
  roles: readonly string[];
  permissions: readonly string[];
  isAdmin: boolean;
}

/**
 * Filters the navigation items by the authentication data.
 * @param items - The navigation items to filter.
 * @param authData - The authentication data to filter the navigation items by.
 * @returns The filtered navigation items.
 */
export function filterNavByAuth(
  items: readonly INavItem[],
  authData: NavigationAuthData | null,
): INavItem[] {
  return items
    .map((item) => filterNavItem(item, authData))
    .filter((item): item is INavItem => item !== null);
}

/**
 * Gets the keys of the navigation items.
 * @param items - The navigation items to get the keys of.
 * @returns The keys of the navigation items.
 */
export function getNavItemKeys(items: readonly INavItem[]): string[] {
  return items.flatMap((item) => [
    item.key,
    ...getNavItemKeys(item.children ?? []),
  ]);
}

/**
 * Filters the navigation items by the keys.
 * @param items - The navigation items to filter.
 * @param keys - The keys to filter the navigation items by.
 * @returns The filtered navigation items.
 */
export function filterNavByKeys(
  items: readonly INavItem[],
  keys: readonly string[] | undefined,
): INavItem[] {
  if (!keys) {
    // Fail closed: never expose role/permission-gated items without server-provided keys.
    return filterNavByAuth(items, null);
  }

  const keySet = new Set(keys);

  return items
    .map((item) => filterNavItemByKey(item, keySet))
    .filter((item): item is INavItem => item !== null);
}

function filterNavItemByKey(
  item: INavItem,
  keys: Set<string>,
): INavItem | null {
  if (!keys.has(item.key)) {
    return null;
  }

  if (!item.children?.length) {
    return item;
  }

  const children = filterSectionHeaders(
    item.children
      .map((child) => filterNavItemByKey(child, keys))
      .filter((child): child is INavItem => child !== null),
  );

  return {
    ...item,
    children,
  };
}

function filterNavItem(
  item: INavItem,
  authData: NavigationAuthData | null,
): INavItem | null {
  if (!canAccessItem(item, authData)) {
    return null;
  }

  if (!item.children?.length) {
    return item;
  }

  const children = filterSectionHeaders(
    item.children
      .map((child) => filterNavItem(child, authData))
      .filter((child): child is INavItem => child !== null),
  );

  return {
    ...item,
    children,
  };
}

function canAccessItem(
  item: INavItem,
  authData: NavigationAuthData | null,
): boolean {
  if (!item.requiredRole && !item.requiredPermission) {
    return true;
  }

  if (!authData) {
    return false;
  }

  const roles = new Set(authData.roles);
  const permissions = new Set(authData.permissions);

  const hasRequiredRole = item.requiredRole
    ? roles.has(item.requiredRole)
    : true;
  const hasRequiredPermission = item.requiredPermission
    ? authData.isAdmin || permissions.has(item.requiredPermission)
    : true;

  return hasRequiredRole && hasRequiredPermission;
}

function filterSectionHeaders(items: INavItem[]): INavItem[] {
  return items.filter((item, index) => {
    if (!item.isSectionHeader) {
      return true;
    }

    const nextItem = items[index + 1];
    return nextItem !== undefined && !nextItem.isSectionHeader;
  });
}
