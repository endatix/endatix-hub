import "server-only";

import { Result } from "@/lib/result";
import { listPlatformTenants } from "../list-tenants/list-tenants.server";
import { listPlatformAdminUsers } from "../list-platform-admins/list-platform-admins.server";
import type { PlatformAdminSession } from "../types";

const COUNT_ONLY = { page: 1, pageSize: 1 } as const;

export interface PlatformDashboardCounts {
  tenants?: number;
  admins: number;
}

export async function getPlatformDashboard(
  session: PlatformAdminSession,
): Promise<PlatformDashboardCounts> {
  const [tenants, admins] = await Promise.all([
    listPlatformTenants(session, COUNT_ONLY),
    listPlatformAdminUsers(session, { ...COUNT_ONLY, scope: "approved" }),
  ]);

  return {
    // A failed tenant count hides one number instead of failing the dashboard.
    tenants: Result.isSuccess(tenants) ? tenants.value.totalRecords : undefined,
    admins: admins.totalRecords,
  };
}
