"use server";

import { createPermissionService } from "@/features/auth/permissions/application";
import { Result } from "@/lib/result";
import { updateFormDefinition } from "@/services/api";
import { revalidatePath } from "next/cache";

export type UpdateFormDefinitionJsonResult = Result<string>;

export async function updateFormDefinitionJsonAction(
  formId: string,
  isDraft: boolean,
  formJson: object | null,
): Promise<UpdateFormDefinitionJsonResult | never> {
  const { requireHubAccess } = await createPermissionService();
  await requireHubAccess();

  try {
    await updateFormDefinition(formId, isDraft, JSON.stringify(formJson));
    revalidatePath(`/forms/${formId}/design`);

    return Result.success(formId);
  } catch (error) {
    console.error("Failed to update form definition", error);
    return Result.error("Failed to update form definition");
  }
}
