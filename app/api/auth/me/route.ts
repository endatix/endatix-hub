import { NextResponse } from "next/server";
import {
  getCacheStats,
  getUserPermissions,
} from "@/features/auth/application/get-user-permissions";
import {
  DEFAULT_PERMISSION_ERROR_MESSAGE,
  isAuthenticationRequired,
} from "@/features/auth";

const PERMISSIONS_CACHE_TTL = 300;

/**
 * API endpoint that returns user permissions
 */
export async function GET() {
  try {
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
