"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { Result } from "@/lib/result";
import { EndatixApi } from "@/lib/endatix-api";
import { revalidatePath } from "next/cache";

export type UpdateFormVisibilityResult = Result<string>;

export async function updateFormVisibilityAction(
  formId: string,
  isPublic: boolean,
): Promise<UpdateFormVisibilityResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = await api.forms.update(formId, { isPublic });

  if (!result.success) {
    console.error("Failed to update form visibility", result.error);
    return Result.error("Failed to update form visibility");
  }

  revalidatePath("/(main)/forms");
  revalidatePath(`/(main)/forms/${formId}`);
  return Result.success(formId);
}
