"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { revalidatePath } from "next/cache";

export type UpdateFormSettingsResult = Result<string>;

interface UpdateFormSettingsPayload {
  limitOnePerUser?: boolean;
  metadata?: string | null;
}

export async function updateFormSettingsAction(
  formId: string,
  payload: UpdateFormSettingsPayload,
): Promise<UpdateFormSettingsResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = await api.forms.update(formId, payload);

  if (!result.success) {
    console.error("Failed to update form settings", result.error);
    return Result.error(
      result.error.message || "Failed to update form settings",
    );
  }

  revalidatePath("/(main)/forms");
  revalidatePath(`/(main)/forms/${formId}`);
  return Result.success(formId);
}
