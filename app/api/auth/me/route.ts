import { NextResponse } from "next/server";
import {
  getCacheStats,
  getUserPermissions,
} from "@/features/auth/application/get-user-permissions";

const PERMISSIONS_CACHE_TTL = 300;

/**
 * API endpoint that returns user permissions
 */
export async function GET() {
  try {
    const permissionsResult = await getUserPermissions();

    if (!permissionsResult.success) {
      if (permissionsResult.error?.type === "AUTHENTICATION_REQUIRED") {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      }

      return NextResponse.json(
        {
          error:
            permissionsResult.error?.message ||
            "Failed to get user permissions",
        },
        { status: 500 },
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
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
