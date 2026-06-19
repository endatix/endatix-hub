import "server-only";

import { listPlatformTenants } from "../list-tenants/list-tenants.server";
import { listPlatformAdminUsers } from "../list-platform-admins/list-platform-admins.server";
import type { PlatformAdminSession } from "../types";

export async function getPlatformDashboard(session: PlatformAdminSession) {
  const [tenants, admins] = await Promise.all([
    listPlatformTenants(session, { page: 1, pageSize: 5 }),
    listPlatformAdminUsers(session, {
      page: 1,
      pageSize: 5,
      scope: "approved",
    }),
  ]);

  return {
    tenants,
    admins,
  };
}
