import { unstable_cache } from "next/cache";
import { auth } from "@/auth";
import { RbacUserInfo } from "../domain/rbac.types";
import { PermissionResult } from "../domain/permission-result";

let _cacheHits = 0;
let _cacheMisses = 0;

async function getUserRbacInfoTemp(
  userId: string,
): Promise<PermissionResult<RbacUserInfo>> {
  try {
    if (!userId) {
      return PermissionResult.unauthenticated();
    }
    const user = {
      userId,
      roles: ["admin"],
      permissions: ["apps.hub.access", "forms.view"],
      permissionsVersion: 1,
      tenantId: "1",
      lastUpdated: new Date().toISOString(),
    };
    return PermissionResult.success(user);
  } catch (error) {
    console.error("Error getting user permissions from session:", error);

    return PermissionResult.error();
  }
}

/**
 * Cached user permissions data
 * Uses Next.js unstable_cache with tags for per-user invalidation. To be replaced with useCache when it's prod readt
 */
const _userPermissions = unstable_cache(
  async (userId: string): Promise<PermissionResult<RbacUserInfo>> => {
    _cacheMisses++;
    _cacheHits--;

    // TODO: Replace with actual API call once UserInfo or "Auth/Me" endpoint (name is TBD) is implemented
    return getUserRbacInfoTemp(userId);
  },
  ["user-permissions"], // Cache key
  {
    tags: ["user-permissions"],
    revalidate: 300, // 5 minutes
  },
);

/**
 * Main function to get user permissions
 * Gets session data outside of cache and passes to cached function
 */
export async function getUserPermissions(): Promise<
  PermissionResult<RbacUserInfo>
> {
  try {
    const session = await auth();

    if (!session?.user?.id || session.error) {
      return PermissionResult.unauthenticated();
    }

    _cacheHits++;

    return _userPermissions(session.user.id);
  } catch (error) {
    console.error("Error getting session for permissions:", error);
    return PermissionResult.error();
  }
}

// Helper function to log cache statistics
export function getCacheStats(format: "json" | "text" = "text") {
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
}
