"use server";

import { authorization } from "@/features/auth/authorization";
import { getSession } from "@/features/auth";
import { Result } from "@/lib/result";
import { EndatixApi } from "@/lib/endatix-api";
import { revalidatePath } from "next/cache";

export type UpdateFormNameResult = Result<string>;

export async function updateFormNameAction(
  formId: string,
  formName: string,
): Promise<UpdateFormNameResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  const session = await getSession();
  const api = new EndatixApi(session);
  const result = await api.forms.update(formId, { name: formName });

  if (!result.success) {
    console.error("Failed to update form name", result.error);
    return Result.error("Failed to update form name");
  }

  revalidatePath(`/(main)/forms/${formId}/design`);
  return Result.success(formId);
}
