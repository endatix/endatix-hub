import "server-only";

import { unstable_update } from "@/auth";
import type { EndatixJwtPayload } from "@/features/auth/infrastructure/jwt.types";
import { Result } from "@/lib/result";
import { decodeJwt } from "jose";

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

  return Result.success(true);
}
