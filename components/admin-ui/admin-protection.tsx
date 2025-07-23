"use server";

import { getSession } from "@/features/auth";
import { forbidden } from "next/navigation";

const HUB_ADMIN_USERNAME = process.env.HUB_ADMIN_USERNAME;

/**
 * Server-side admin protection function.
 * Must be used in Server Components only.
 */
export async function requireAdmin() {
  const session = await getSession();

  if (!HUB_ADMIN_USERNAME || session?.username !== HUB_ADMIN_USERNAME) {
    forbidden();
  }

  return session;
}
