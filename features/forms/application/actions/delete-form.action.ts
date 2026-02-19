"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { Result } from "@/lib/result";
import { EndatixApi } from "@/lib/endatix-api";

export type DeleteFormResult = Result<string>;

export async function deleteFormAction(
  formId: string,
): Promise<DeleteFormResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = await api.forms.delete(formId);

  if (!result.success) {
    console.error("Failed to delete form", result.error);
    return Result.error("Failed to delete form");
  }

  return Result.success(formId);
}
