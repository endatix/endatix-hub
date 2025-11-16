"use server";

import { authorization } from "@/features/auth/permissions";
import { Result } from "@/lib/result";
import { deleteForm } from "@/services/api";

export type DeleteFormResult = Result<string>;

export async function deleteFormAction(
  formId: string,
): Promise<DeleteFormResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();
  
  try {
    const deletedFormId = await deleteForm(formId);
    return Result.success(deletedFormId);
  } catch (error) {
    console.error("Failed to delete form", error);
    return Result.error("Failed to delete form");
  }
}
