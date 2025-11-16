"use server";

import { authorization } from "@/features/auth/permissions";
import { CreateFormRequest } from "@/lib/form-types";
import { Result } from "@/lib/result";
import { createForm } from "@/services/api";

export type CreateFormResult = Result<string>;

export async function createFormAction(
  request: CreateFormRequest,
): Promise<CreateFormResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  try {
    const form = await createForm(request);
    if (form.id?.length > 0) {
      return Result.success(form.id);
    }
  } catch (error) {
    console.error("Failed to create form", error);
  }
  return Result.error("Failed to create form");
}
