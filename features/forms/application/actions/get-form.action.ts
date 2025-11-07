"use server";

import { createPermissionService } from "@/features/auth/permissions/application";
import { getForm } from "@/services/api";
import { Result } from "@/lib/result";
import type { Form } from "@/types";

export type GetFormResult = Result<Form>;

export async function getFormAction(formId: string): Promise<GetFormResult | never> {
  const { requireHubAccess } = await createPermissionService();
  await requireHubAccess();

  try {
    const form = await getForm(formId);
    return Result.success(form);
  } catch (error) {
    console.error("Failed to fetch form", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch form";
    return Result.error(errorMessage);
  }
}
