"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { Result } from "@/lib/result";
import { EndatixApi } from "@/lib/endatix-api";
import { revalidatePath } from "next/cache";

export type UpdateFormNameResult = Result<string>;

export async function updateFormNameAction(
  formId: string,
  formName: string,
): Promise<UpdateFormNameResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = await api.forms.update(formId, { name: formName });

  if (!result.success) {
    console.error("Failed to update form name", result.error);
    return Result.error("Failed to update form name");
  }

  revalidatePath(`/(main)/forms/${formId}/design`);
  return Result.success(formId);
}
