import "server-only";

import type { Session } from "next-auth";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";

export async function requirePlatformAdmin(
  session?: Session | null,
): Promise<Session> {
  const resolvedSession = session ?? (await auth());
  const { requirePlatformAdmin: guard } = await authorization(resolvedSession);
  await guard();

  if (!resolvedSession) {
    throw new Error("Platform admin session is required.");
  }

  return resolvedSession;
}
