"use server";

import { ensureAuthenticated } from "@/features/auth";
import { updateForm } from "@/services/api";
import { revalidatePath } from 'next/cache';

export async function updateFormNameAction(formId: string, formName: string) {
  await ensureAuthenticated();

  try {
    await updateForm(formId, { name: formName });
    revalidatePath(`/forms/${formId}/designer`);
    
    return { success: true };
  } catch (error) {
    console.error("Failed to update form name", error);
    return { success: false, error: "Failed to update form name" };
  }
}
