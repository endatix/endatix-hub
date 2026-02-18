"use server";

import { authorization } from "@/features/auth/authorization";
import { Result } from "@/lib/result";
import { updateForm } from "@/services/api";
import { revalidatePath } from "next/cache";

export type UpdateFormVisibilityResult = Result<string>;

export async function updateFormVisibilityAction(
  formId: string,
  isPublic: boolean,
): Promise<UpdateFormVisibilityResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  try {
    await updateForm(formId, { isPublic });
    revalidatePath("/(main)/forms");
    revalidatePath(`/(main)/forms/${formId}`);
    return Result.success(formId);
  } catch (error) {
    console.error("Failed to update form visibility", error);
    return Result.error("Failed to update form visibility");
  }
}
