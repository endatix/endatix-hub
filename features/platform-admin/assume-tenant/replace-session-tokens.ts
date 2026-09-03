import "server-only";

import { unstable_update } from "@/auth";
import { invalidateUserAuthorizationCache } from "@/features/auth/authorization/application/authorization-data.provider";
import type { EndatixJwtPayload } from "@/features/auth/infrastructure/jwt.types";
import { Result } from "@/lib/result";
import { TelemetryLogger } from "@/features/telemetry";
import { decodeJwt } from "jose";
import { TENANTS_LOGGER_NAME } from "../tenant-management.constants";

export async function replaceSessionTokens(
  accessToken: string,
  refreshToken: string,
) {
  let payload: EndatixJwtPayload;
  try {
    payload = decodeJwt<EndatixJwtPayload>(accessToken);
  } catch {
    return Result.error("Failed to replace session tokens");
  }

  if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
    return Result.error("Assumed session token is missing an expiry.");
  }

  try {
    await unstable_update({
      accessToken,
      refreshToken,
      expiresAt: payload.exp,
    });
  } catch {
    return Result.error("Failed to replace session tokens");
  }

  // The cookie already holds the new tokens, so a stale cache must not undo a
  // completed swap — log it and let the caller continue.
  if (payload.sub) {
    try {
      invalidateUserAuthorizationCache({ userId: payload.sub });
    } catch (error) {
      TelemetryLogger.warn(
        "Failed to invalidate the authorization cache after a session swap",
        { error: String(error) },
        TENANTS_LOGGER_NAME,
      );
    }
  }

  return Result.success(true);
}
