"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { Result } from "@/lib/result";
import { EndatixApi } from "@/lib/endatix-api";
import type { Form } from "@/types";

export type GetFormResult = Result<Form>;

export async function getFormAction(formId: string): Promise<GetFormResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = await api.forms.get(formId);

  if (!result.success) {
    console.error("Failed to fetch form", result.error);
    return Result.error(result.error.message);
  }

  return Result.success(result.data);
}
