"use server";

import { authorization } from "@/features/auth/authorization";
import { updateForm } from "@/services/api";
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
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  try {
    const { formId, themeId } = request;
    await updateForm(formId, { themeId: themeId });
    revalidatePath(`/(main)/forms/${formId}/design`);

    return { success: true };
  } catch (error) {
    console.error("Failed to update form theme", error);
    return { success: false, error: "Failed to update form theme" };
  }
}
