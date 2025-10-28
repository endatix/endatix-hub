"use server";

import { createPermissionService } from "@/features/auth/permissions/application";
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
  const { requireHubAccess } = await createPermissionService();
  await requireHubAccess();

  try {
    const { formId, themeId } = request;
    await updateForm(formId, { themeId: themeId });
    revalidatePath(`/forms/${formId}/design`);

    return { success: true };
  } catch (error) {
    console.error("Failed to update form theme", error);
    return { success: false, error: "Failed to update form theme" };
  }
}
