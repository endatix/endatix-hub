"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { Result, toResult } from "@/lib/result";
import { EndatixApi } from "@/lib/endatix-api";
import { revalidatePath } from "next/cache";

export type UpdateFormVisibilityResult = Result<string>;
const visibilityFailure = { fallbackMessage: "Failed to update form visibility", logMessage: "Failed to update form visibility", loggerName: "forms.visibility" };

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
    return toResult<string>(result, visibilityFailure);
  }

  revalidatePath("/(main)/forms");
  revalidatePath(`/(main)/forms/${formId}`);
  return Result.success(formId);
}
