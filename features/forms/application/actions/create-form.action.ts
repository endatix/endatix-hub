"use server";

import { authorization } from "@/features/auth/authorization";
import { getSession } from "@/features/auth";
import { CreateFormRequest } from "@/lib/form-types";
import { Result } from "@/lib/result";
import { EndatixApi } from "@/lib/endatix-api";

export type CreateFormResult = Result<string>;

export async function createFormAction(
  request: CreateFormRequest,
): Promise<CreateFormResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  const session = await getSession();
  const api = new EndatixApi(session);
  const result = await api.forms.create(request);

  if (!result.success) {
    console.error("Failed to create form", result.error);
    return Result.error("Failed to create form");
  }

  if (!result.data.id || result.data.id.length === 0) {
    return Result.error("Failed to create form");
  }

  return Result.success(result.data.id);
}
