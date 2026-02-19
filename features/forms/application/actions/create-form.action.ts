"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { CreateFormRequest } from "@/lib/form-types";
import { Result } from "@/lib/result";
import { EndatixApi } from "@/lib/endatix-api";

export type CreateFormResult = Result<string>;

export async function createFormAction(
  request: CreateFormRequest,
): Promise<CreateFormResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
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
