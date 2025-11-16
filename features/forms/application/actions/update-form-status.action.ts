"use server";

import { authorization } from "@/features/auth/permissions";
import { Result } from "@/lib/result";
import { updateForm } from "@/services/api";

export type UpdateFormStatusResult = Result<string>;

export async function updateFormStatusAction(
  formId: string,
  isEnabled: boolean,
): Promise<UpdateFormStatusResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  try {
    await updateForm(formId, { isEnabled });
    return Result.success(formId);
  } catch (error) {
    console.error("Failed to update form status", error);
    return Result.error("Failed to update form status");
  }
}
