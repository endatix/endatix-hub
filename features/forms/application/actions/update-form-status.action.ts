"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { Result } from "@/lib/result";
import { EndatixApi } from "@/lib/endatix-api";
import { revalidatePath } from "next/cache";

export type UpdateFormStatusResult = Result<string>;

export async function updateFormStatusAction(
  formId: string,
  isEnabled: boolean,
): Promise<UpdateFormStatusResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = await api.forms.update(formId, { isEnabled });

  if (!result.success) {
    console.error("Failed to update form status", result.error);
    return Result.error("Failed to update form status");
  }

  revalidatePath("/(main)/forms");
  revalidatePath(`/(main)/forms/${formId}`);
  return Result.success(formId);
}
