import "server-only";

import { saasManagementFlag } from "@/lib/feature-flags/flags";
import { Result } from "@/lib/result";
import { listPlatformTenants } from "../list-tenants/list-tenants.server";
import { listPlatformAdminUsers } from "../list-platform-admins/list-platform-admins.server";
import { listSignupRequests } from "../list-signup-requests/list-signup-requests.server";
import type { PlatformAdminSession } from "../types";

const COUNT_ONLY = { page: 1, pageSize: 1 } as const;

export interface PlatformDashboardCounts {
  tenants?: number;
  admins: number;
  /** Omitted when signup is off; `pending` is undefined when the count failed. */
  signupRequests?: { pending?: number };
}

export async function getPlatformDashboard(
  session: PlatformAdminSession,
): Promise<PlatformDashboardCounts> {
  const [tenants, admins, signupRequests] = await Promise.all([
    listPlatformTenants(session, COUNT_ONLY),
    listPlatformAdminUsers(session, { ...COUNT_ONLY, scope: "approved" }),
    getPendingSignupRequests(session),
  ]);

  return {
    // A failed tenant count hides one number instead of failing the dashboard.
    tenants: Result.isSuccess(tenants) ? tenants.value.totalRecords : undefined,
    admins: admins.totalRecords,
    signupRequests,
  };
}

async function getPendingSignupRequests(
  session: PlatformAdminSession,
): Promise<PlatformDashboardCounts["signupRequests"]> {
  if (!(await saasManagementFlag())) {
    return undefined;
  }

  const pending = await listSignupRequests(
    session,
    {
      ...COUNT_ONLY,
      status: "pending",
    },
    { notFoundAsEmpty: false },
  );
  return {
    pending: Result.isSuccess(pending) ? pending.value.totalRecords : undefined,
  };
}
