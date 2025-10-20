import { unstable_cache } from "next/cache";
import { Session } from "next-auth";
import { PermissionResult } from "../../rbac/permission-result";
import { UserRbacInfo, Permissions } from "../../rbac";

// Cache statistics
let _cacheHits = 0;
let _cacheMisses = 0;

async function getUserRbacInfo(
  userId: string,
): Promise<PermissionResult<UserRbacInfo>> {
  try {
    if (!userId) {
      return PermissionResult.unauthenticated();
    }

    /**
     * **** DON'T PANIC ****
     * This is the only permission that is used in the hub for now, so this is not compromising security at this point
     * We will replace this in next commits with permissions from the server, to control access to the hub and forms
     * Users will still be redirected to the unauthorised page if the Endatix API returns a 403 error
     */
    const user = {
      userId,
      roles: [],
      permissions: [Permissions.Admin.All],
      permissionsVersion: 1,
      lastUpdated: new Date().toISOString(),
    };
    return PermissionResult.success(user);
  } catch (error) {
    console.error("Error getting user permissions from session:", error);
    return PermissionResult.error();
  }
}

// Cached user permissions data
const _userPermissions = unstable_cache(
  async (userId: string): Promise<PermissionResult<UserRbacInfo>> => {
    _cacheMisses++;
    _cacheHits--;

    // TODO: Replace with actual API call once UserInfo or "Auth/Me" endpoint (name is TBD) is implemented
    return getUserRbacInfo(userId);
  },
  ["user-permissions"], // Cache key
  {
    tags: ["user-permissions"],
    revalidate: 300, // 5 minutes
  },
);

export function getUserPermissionsFactory(session: Session | null) {
  return async (): Promise<PermissionResult<UserRbacInfo>> => {
    try {
      if (!session?.user?.id || session.error) {
        return PermissionResult.unauthenticated();
      }

      _cacheHits++;

      return _userPermissions(session.user.id);
    } catch (error) {
      console.error("Error getting session for permissions:", error);
      return PermissionResult.error();
    }
  };
}

export function getCacheStatsFactory() {
  return (format: "json" | "text" = "text") => {
    const totalRequests = _cacheHits + _cacheMisses;
    const hitRate =
      totalRequests > 0 ? ((_cacheHits / totalRequests) * 100).toFixed(1) : 0;

    if (format === "text") {
      return `📊 [RBAC Cache Stats] Total Requests: ${totalRequests}, Hits: ${_cacheHits}, Misses: ${_cacheMisses}, Hit Rate: ${hitRate}%`;
    }

    return {
      totalRequests,
      cacheHits: _cacheHits,
      cacheMisses: _cacheMisses,
      hitRate,
    };
  };
}
