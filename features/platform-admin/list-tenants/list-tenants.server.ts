import "server-only";

import { EndatixApi } from "@/lib/endatix-api";
import type { ListPlatformTenantsRequest } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { DataLoadError } from "@/lib/errors/data-load-error";
import { normalizePagedResponse } from "@/lib/endatix-api/shared/paged-response";
import type { PlatformAdminSession } from "../types";

export async function listPlatformTenants(
  session: PlatformAdminSession,
  request: ListPlatformTenantsRequest,
) {
  const api = new EndatixApi(session.accessToken);
  const apiResult = await api.platformTenants.list(request);
  const result = toResult(apiResult, {
    fallbackMessage: "Failed to load platform tenants.",
    logMessage: "Failed to load platform tenants.",
    loggerName: "platform-admin.tenants",
  });

  if (Result.isError(result)) {
    throw new DataLoadError(result.message);
  }

  return normalizePagedResponse(result.value);
}
