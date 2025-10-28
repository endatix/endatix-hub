"use server";

import { FormTemplate } from "@/types";
import { getFormTemplates } from "@/services/api";
import { Result } from "@/lib/result";
import { createPermissionService } from "@/features/auth/permissions/application";

export type GetTemplatesResult = Result<FormTemplate[]>;

export async function getTemplatesAction(): Promise<
  GetTemplatesResult | never
> {
  const { requireHubAccess } = await createPermissionService();
  await requireHubAccess();

  try {
    const templates = await getFormTemplates();
    return Result.success(templates);
  } catch (error) {
    console.error("Error fetching form templates:", error);
    return Result.error("Failed to fetch form templates");
  }
}
