import "server-only";

import { EndatixApi } from "@/lib/endatix-api";
import type { ListPlatformTenantsRequest } from "@/lib/endatix-api";
import type { PlatformTenantsPage } from "@/lib/endatix-api/platform-tenants/platform-tenants";
import { toResult } from "@/lib/result/map-api-result-to-result";
import type { ResultType } from "@/lib/result";
import type { PlatformAdminSession } from "../types";
import { TENANTS_LOGGER_NAME } from "../tenant-management.server";

export async function listPlatformTenants(
  session: PlatformAdminSession,
  request: ListPlatformTenantsRequest,
): Promise<ResultType<PlatformTenantsPage>> {
  const api = new EndatixApi(session.accessToken);
  return toResult(await api.platformTenants.list(request), {
    fallbackMessage: "Failed to load platform tenants.",
    logMessage: "Failed to load platform tenants.",
    loggerName: TENANTS_LOGGER_NAME,
  });
}
