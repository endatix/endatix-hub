"use server";

import { createPermissionService } from "@/features/auth/permissions/application";
import { Result } from "@/lib/result";
import { updateForm } from "@/services/api";
import { revalidatePath } from "next/cache";

export type UpdateFormNameResult = Result<string>;

export async function updateFormNameAction(
  formId: string,
  formName: string,
): Promise<UpdateFormNameResult | never> {
  const { requireHubAccess } = await createPermissionService();
  await requireHubAccess();

  try {
    await updateForm(formId, { name: formName });
    revalidatePath(`/forms/${formId}/design`);

    return Result.success(formId);
  } catch (error) {
    console.error("Failed to update form name", error);
    return Result.error("Failed to update form name");
  }
}
