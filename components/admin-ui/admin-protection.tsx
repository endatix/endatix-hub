"use server";

import { requirePlatformAdmin } from "@/features/platform-admin/server";

/**
 * Server-side admin protection function.
 * Must be used in Server Components only.
 */
export async function requireAdmin() {
  return await requirePlatformAdmin();
}
