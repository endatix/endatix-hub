"use server";

import { authorization } from "@/features/auth/authorization";
import { getSession } from "@/features/auth";
import { Result } from "@/lib/result";
import { EndatixApi } from "@/lib/endatix-api";
import { revalidatePath } from "next/cache";

export type UpdateFormVisibilityResult = Result<string>;

export async function updateFormVisibilityAction(
  formId: string,
  isPublic: boolean,
): Promise<UpdateFormVisibilityResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  const session = await getSession();
  const api = new EndatixApi(session);
  const result = await api.forms.update(formId, { isPublic });

  if (!result.success) {
    console.error("Failed to update form visibility", result.error);
    return Result.error("Failed to update form visibility");
  }

  revalidatePath("/(main)/forms");
  revalidatePath(`/(main)/forms/${formId}`);
  return Result.success(formId);
}
