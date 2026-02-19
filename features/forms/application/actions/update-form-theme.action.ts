"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { revalidatePath } from "next/cache";

interface UpdateFormThemeRequest {
  formId: string;
  themeId: string;
}

export interface UpdateFormThemeResult {
  success: boolean;
  error?: string;
}

export async function updateFormThemeAction(
  request: UpdateFormThemeRequest,
): Promise<UpdateFormThemeResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const { formId, themeId } = request;
  const result = await api.forms.update(formId, { themeId });

  if (!result.success) {
    console.error("Failed to update form theme", result.error);
    return { success: false, error: "Failed to update form theme" };
  }

  revalidatePath(`/(main)/forms/${formId}/design`);
  return { success: true };
}
