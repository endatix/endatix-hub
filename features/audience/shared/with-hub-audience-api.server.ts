import "server-only";

import { revalidatePath } from "next/cache";
import type { EndatixApi } from "@/lib/endatix-api";
import type { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result, toResult } from "@/lib/result";
import type { MapApiResultToResultOptions } from "@/lib/result/map-api-result-to-result";
import { requireAudienceApi } from "./require-audience-api.server";

type ToResultOptions = {
  /** Hub permission for this write (`forms.edit`, `tenant.settings.manage`, …). */
  permission: string;
  fallbackMessage: string;
  logMessage: string;
  loggerName: string;
  /** The form whose audience page shows the change; omit for a tenant-wide setting. */
  formId?: string;
};

/**
 * Runs one audience call behind the shared guard and maps it to a `Result`. A `server-only`
 * helper, not a server action: actions call it, clients cannot.
 */
export async function withHubAudienceApi<T>(
  run: (api: EndatixApi) => Promise<ApiResult<T>>,
  options: ToResultOptions,
): Promise<Result<T>> {
  const { formId, permission, ...log } = options;
  const api = await requireAudienceApi(permission);
  if (Result.isError(api)) return api;
  const result = toResult(
    await run(api.value),
    log as MapApiResultToResultOptions<T>,
  );
  if (Result.isSuccess(result) && formId) {
    revalidatePath(`/(main)/forms/${formId}/audience`);
  }
  return result;
}
