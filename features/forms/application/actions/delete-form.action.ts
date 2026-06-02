"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { Result } from "@/lib/result";
import { mapToResult } from "@/lib/result/map-api-result-to-result";
import { EndatixApi } from "@/lib/endatix-api";

export type DeleteFormResult = Result<string>;

export async function deleteFormAction(
  formId: string,
): Promise<DeleteFormResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const apiResult = await api.forms.delete(formId);

  if (!apiResult.success) {
    return mapToResult(apiResult, {
      fallbackMessage: "Failed to delete form",
      logMessage: "Failed to delete form",
      loggerName: "forms",
      mapData: () => formId,
    });
  }

  return Result.success(formId);
}
