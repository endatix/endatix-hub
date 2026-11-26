"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { Result, toResult } from "@/lib/result";
import { EndatixApi } from "@/lib/endatix-api";
import { revalidatePath } from "next/cache";

export type UpdateFormStatusResult = Result<string>;
const statusFailure = {fallbackMessage:"Failed to update form status", logMessage:"Failed to update form status", loggerName:"forms.status"};

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
    return toResult<string>(result, statusFailure);
  }

  revalidatePath("/(main)/forms");
  revalidatePath(`/(main)/forms/${formId}`);
  return Result.success(formId);
}
