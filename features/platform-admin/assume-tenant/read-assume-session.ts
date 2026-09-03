import { decodeJwt } from "jose";
import type { EndatixJwtPayload } from "@/features/auth/infrastructure/jwt.types";

export interface AssumeSession {
  actorUserId: string;
  tenantId: string;
}

export function readAssumeSession(
  accessToken: string | undefined | null,
): AssumeSession | null {
  if (!accessToken) {
    return null;
  }

  try {
    const payload = decodeJwt<EndatixJwtPayload>(accessToken);
    if (!payload.act || !payload.tid) {
      return null;
    }

    return {
      actorUserId: String(payload.act),
      tenantId: String(payload.tid),
    };
  } catch {
    return null;
  }
}
