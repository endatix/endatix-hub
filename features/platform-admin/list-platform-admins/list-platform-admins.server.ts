import "server-only";

import { EndatixApi } from "@/lib/endatix-api";
import type { ListPlatformAdminsRequest } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { DataLoadError } from "@/lib/errors/data-load-error";
import type { PlatformAdminSession } from "../types";

export async function listPlatformAdminUsers(
  session: PlatformAdminSession,
  request: ListPlatformAdminsRequest,
) {
  const api = new EndatixApi(session.accessToken);
  const apiResult = await api.platformAdmins.list(request);
  const result = toResult(apiResult, {
    fallbackMessage: "Failed to load platform administrators.",
    logMessage: "Failed to load platform administrators.",
    loggerName: "platform-admin.admins",
  });

  if (Result.isError(result)) {
    throw new DataLoadError(result.message);
  }

  return result.value;
}
