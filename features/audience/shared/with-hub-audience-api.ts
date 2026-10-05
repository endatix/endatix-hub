"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { revalidatePath } from "next/cache";
import { Result, toResult } from "@/lib/result";
import type { MapApiResultToResultOptions } from "@/lib/result/map-api-result-to-result";

type ToResultOptions = {
  fallbackMessage: string;
  logMessage: string;
  loggerName: string;
  formId: string;
};

export async function withHubAudienceApi<T>(
  run: (api: EndatixApi) => Promise<ApiResult<T>>,
  options: ToResultOptions,
): Promise<Result<T>> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();
  const session = await auth();
  const { formId, ...log } = options;
  const result = toResult(
    await run(new EndatixApi(session?.accessToken)),
    log as MapApiResultToResultOptions<T>,
  );
  if (Result.isSuccess(result)) {
    revalidatePath(`/(main)/forms/${formId}/audience`);
  }
  return result;
}
