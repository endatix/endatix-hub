import "server-only";

import { listPlatformTenants } from "../list-tenants/list-tenants.server";
import { listPlatformAdmins } from "../list-platform-admins/list-platform-admins.server";
import type { PlatformAdminSession } from "../types";

export async function getPlatformDashboard(session: PlatformAdminSession) {
  const [tenants, admins] = await Promise.all([
    listPlatformTenants(session, { page: 1, pageSize: 5 }),
    listPlatformAdmins(session, { page: 1, pageSize: 5 }),
  ]);

  return {
    tenants,
    admins,
  };
}
