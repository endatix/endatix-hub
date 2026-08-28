"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, toResult } from "@/lib/result";
import { revalidatePath } from "next/cache";

interface UpdateFormThemeRequest {
  formId: string;
  themeId: string | null;
}

export type UpdateFormThemeResult = Result<void>;

export async function updateFormThemeAction(
  request: UpdateFormThemeRequest,
): Promise<UpdateFormThemeResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const { formId, themeId } = request;
  const updated = await api.forms.update(formId, { themeId });

  const result = toResult(updated, {
    mapData: () => undefined,
    fallbackMessage: "Failed to update form theme",
    logMessage: "Failed to update form theme",
    loggerName: "forms.update",
  });

  if (Result.isSuccess(result)) {
    revalidatePath(`/(main)/forms/${formId}/design`);
  }

  return result;
}
