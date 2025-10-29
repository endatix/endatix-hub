"use server";

import { getSession, UNAUTHORIZED_PATH } from "@/features/auth";
import { redirect } from "next/navigation";

const HUB_ADMIN_USERNAME = process.env.HUB_ADMIN_USERNAME;

/**
 * Server-side admin protection function.
 * Must be used in Server Components only.
 */
export async function requireAdmin() {
  const session = await getSession();

  if (!HUB_ADMIN_USERNAME || session?.username !== HUB_ADMIN_USERNAME) {
    redirect(UNAUTHORIZED_PATH);
  }

  return session;
}
