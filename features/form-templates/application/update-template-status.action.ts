"use server";

import { ensureAuthenticated } from "@/features/auth";
import { updateFormTemplate } from "@/services/api";
import { revalidatePath } from 'next/cache';

export async function updateTemplateStatusAction(
  templateId: string,
  isEnabled: boolean,
) {
  await ensureAuthenticated();

  try {
    await updateFormTemplate(templateId, { isEnabled });
    revalidatePath(
      `/forms/form-templates`,
    );
    return { success: true };
  } catch (error) {
    console.error("Failed to update form template status", error);
    return { success: false, error: "Failed to update form template status" };
  }
}
