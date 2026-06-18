import type { Session } from "next-auth";
import { requirePlatformAdmin } from "@/features/platform-admin/server";

/**
 * Server-side admin protection. Use from Server Components and server modules only.
 */
export async function requireAdmin(session?: Session | null) {
  return requirePlatformAdmin(session);
}
