import "server-only";

import { unstable_update } from "@/auth";
import { invalidateUserAuthorizationCache } from "@/features/auth/authorization/application/authorization-data.provider";
import type { EndatixJwtPayload } from "@/features/auth/infrastructure/jwt.types";
import { Result } from "@/lib/result";
import { decodeJwt } from "jose";

export async function replaceSessionTokens(
  accessToken: string,
  refreshToken: string,
) {
  try {
    const payload = decodeJwt<EndatixJwtPayload>(accessToken);
    await unstable_update({
      accessToken,
      refreshToken,
      expiresAt: payload.exp || Date.now() / 1000,
    });

    if (payload.sub) {
      invalidateUserAuthorizationCache({ userId: payload.sub });
    }

    return Result.success(true);
  } catch {
    return Result.error("Failed to replace session tokens");
  }
}
