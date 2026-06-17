import { EndatixApi } from "@/lib/endatix-api";
import type { ListPlatformAdminsRequest } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { DataLoadError } from "@/lib/errors/data-load-error";
import { requirePlatformAdmin } from "../server";

type PlatformAdminSession = Awaited<ReturnType<typeof requirePlatformAdmin>>;

export async function listPlatformAdmins(
  request: ListPlatformAdminsRequest,
  session?: PlatformAdminSession,
) {
  const platformAdminSession = session ?? (await requirePlatformAdmin());
  const api = new EndatixApi(platformAdminSession?.accessToken);
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

export async function listPlatformAdminCandidates(
  request: ListPlatformAdminsRequest,
  session?: PlatformAdminSession,
) {
  const platformAdminSession = session ?? (await requirePlatformAdmin());
  const api = new EndatixApi(platformAdminSession?.accessToken);
  const apiResult = await api.platformAdmins.listCandidates(request);
  const result = toResult(apiResult, {
    fallbackMessage: "Failed to load platform administrator candidates.",
    logMessage: "Failed to load platform administrator candidates.",
    loggerName: "platform-admin.admins",
  });

  if (Result.isError(result)) {
    throw new DataLoadError(result.message);
  }

  return result.value;
}
