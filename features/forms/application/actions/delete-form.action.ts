"use server";

import { authorization } from "@/features/auth/authorization";
import { getSession } from "@/features/auth";
import { Result } from "@/lib/result";
import { EndatixApi } from "@/lib/endatix-api";

export type DeleteFormResult = Result<string>;

export async function deleteFormAction(
  formId: string,
): Promise<DeleteFormResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  const session = await getSession();
  const api = new EndatixApi(session);
  const result = await api.forms.delete(formId);

  if (!result.success) {
    console.error("Failed to delete form", result.error);
    return Result.error("Failed to delete form");
  }

  return Result.success(formId);
}
