"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, toResult } from "@/lib/result";
import { revalidatePath } from "next/cache";

export type UpdateFormSettingsResult = Result<string>;

interface UpdateFormSettingsPayload {
  limitOnePerUser?: boolean;
  submissionTokenExpiryHours?: number | null;
  clearSubmissionTokenExpiryHours?: boolean;
  metadata?: string | null;
  folderId?: string | null;
  clearFolderId?: boolean;
}

export async function updateFormSettingsAction(
  formId: string,
  payload: UpdateFormSettingsPayload,
): Promise<UpdateFormSettingsResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = toResult(await api.forms.update(formId, payload), {
    fallbackMessage: "Failed to update form settings",
    logMessage: "Failed to update form settings",
    loggerName: "forms.settings",
  });
  if (Result.isError(result)) return result;

  revalidatePath("/(main)/forms");
  revalidatePath(`/(main)/forms/${formId}`);
  return Result.success(formId);
}
