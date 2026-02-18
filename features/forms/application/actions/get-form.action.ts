"use server";

import { authorization } from "@/features/auth/authorization";
import { getSession } from "@/features/auth";
import { Result } from "@/lib/result";
import { EndatixApi } from "@/lib/endatix-api";
import type { Form } from "@/types";

export type GetFormResult = Result<Form>;

export async function getFormAction(formId: string): Promise<GetFormResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  const session = await getSession();
  const api = new EndatixApi(session);
  const result = await api.forms.get(formId);

  if (!result.success) {
    console.error("Failed to fetch form", result.error);
    return Result.error(result.error.message);
  }

  return Result.success(result.data);
}
