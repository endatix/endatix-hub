import "server-only";

import { listPlatformAdminUsers } from "../list-platform-admins/list-platform-admins.server";
import type { PlatformAdminSession } from "../types";
import type { SignupReviewers } from "./types";

// Deciders are platform admins; one page covers any realistic admin team.
const REVIEWER_PAGE = { page: 1, pageSize: 100, scope: "approved" } as const;

/**
 * Names for `decidedByUserId`. Best effort: a failed lookup or a revoked admin
 * falls back to the id in the UI, so the list never fails over a label.
 */
export async function listSignupReviewers(
  session: PlatformAdminSession,
): Promise<SignupReviewers> {
  try {
    const admins = await listPlatformAdminUsers(session, REVIEWER_PAGE);
    return Object.fromEntries(
      admins.items.map((admin) => [
        admin.id,
        admin.displayName?.trim() || admin.email?.trim() || admin.userName,
      ]),
    );
  } catch {
    return {};
  }
}
