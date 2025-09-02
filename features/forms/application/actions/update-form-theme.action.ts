"use server";

import { ensureAuthenticated } from "@/features/auth";
import { updateForm } from "@/services/api";
import { revalidatePath } from "next/cache";

export async function updateFormThemeAction(formId: string, themeId: string) {
  await ensureAuthenticated();

  try {
    await updateForm(formId, { themeId: themeId });
    revalidatePath(`/forms/${formId}/designer`);

    return { success: true };
  } catch (error) {
    console.error("Failed to update form theme", error);
    return { success: false, error: "Failed to update form theme" };
  }
}
