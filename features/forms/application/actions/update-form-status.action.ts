"use server";

import { authorization } from "@/features/auth/authorization";
import { Result } from "@/lib/result";
import { updateForm } from "@/services/api";
import { revalidatePath } from "next/cache";

export type UpdateFormStatusResult = Result<string>;

export async function updateFormStatusAction(
  formId: string,
  isEnabled: boolean,
): Promise<UpdateFormStatusResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  try {
    await updateForm(formId, { isEnabled });
    revalidatePath("/(main)/forms");
    revalidatePath(`/(main)/forms/${formId}`);
    return Result.success(formId);
  } catch (error) {
    console.error("Failed to update form status", error);
    return Result.error("Failed to update form status");
  }
}
