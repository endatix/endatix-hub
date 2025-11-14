import { NextResponse } from "next/server";
import {
  DEFAULT_PERMISSION_ERROR_MESSAGE,
  isAuthenticationRequired,
} from "@/features/auth";
import { createPermissionService } from "@/features/auth/permissions/application";

/**
 * API endpoint that returns user permissions
 */
export async function GET() {
  try {
    const { getUserPermissions } = await createPermissionService();
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

    const authData = permissionsResult.data!;
    const response = NextResponse.json(authData);

    const expiresAt = Date.parse(authData.expiresAt);
    const now = Date.now();

    if (!isNaN(expiresAt) && expiresAt > now) {
      const maxAge = Math.floor((expiresAt - now) / 1000);
      response.headers.set(
        "Cache-Control",
        `private, max-age=${maxAge}, stale-while-revalidate=${maxAge / 2}`,
      );
      response.headers.set("ETag", `"${authData.eTag}"`);
    }
    return response;
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
