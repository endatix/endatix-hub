"use server";

import { ensureAuthenticated } from "@/features/auth";
import { updateFormDefinition } from "@/services/api";
import { revalidatePath } from "next/cache";

export async function updateFormDefinitionJsonAction(
  formId: string,
  isDraft: boolean,
  formJson: object | null,
) {
  await ensureAuthenticated();

  try {
    await updateFormDefinition(formId, isDraft, JSON.stringify(formJson));
    revalidatePath(`/forms/${formId}/designer`);

    return { success: true };
  } catch (error) {
    console.error("Failed to update form definition", error);
    return { success: false, error: "Failed to update form definition" };
  }
}
