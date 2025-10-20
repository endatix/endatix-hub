import { NextResponse } from "next/server";
import {
  DEFAULT_PERMISSION_ERROR_MESSAGE,
  isAuthenticationRequired,
} from "@/features/auth";
import { auth } from "@/auth";
import { createPermissionService } from "@/features/auth/permissions/application";

const PERMISSIONS_CACHE_TTL = 300;

/**
 * API endpoint that returns user permissions
 */
export async function GET() {
  try {
    const session = await auth();
    const { getUserPermissions, getCacheStats } =
      createPermissionService(session);
    const permissionsResult = await getUserPermissions();

    if (!permissionsResult.success) {
      const statusCode = isAuthenticationRequired(permissionsResult)
        ? 401
        : 500;
      return NextResponse.json(
        {
          error:
            permissionsResult.error?.message ||
            DEFAULT_PERMISSION_ERROR_MESSAGE,
        },
        { status: statusCode },
      );
    }

    const user = permissionsResult.data!;
    const response = NextResponse.json(user);

    response.headers.set(
      "Cache-Control",
      `private, max-age=${PERMISSIONS_CACHE_TTL}, stale-while-revalidate=${
        PERMISSIONS_CACHE_TTL / 2
      }`,
    );
    response.headers.set("ETag", `"${user.permissionsVersion}-${user.userId}"`);

    // TODO: Remove this. It's temporary for debugging the cache stats
    const cacheStats = getCacheStats();
    console.log(cacheStats);

    return response;
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
