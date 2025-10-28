"use server";

import { FormTemplate } from "@/types";
import { getFormTemplate } from "@/services/api";
import { createPermissionService } from "@/features/auth/permissions/application";
import { Result } from "@/lib/result";

export type GetTemplateResult = Result<FormTemplate>;

export async function getTemplateAction(
  templateId: string,
): Promise<GetTemplateResult | never> {
  const { requireHubAccess } = await createPermissionService();
  await requireHubAccess();

  try {
    const template = await getFormTemplate(templateId);
    return Result.success(template);
  } catch (error) {
    console.error("Error fetching form template:", error);
    return Result.error("Failed to fetch form template");
  }
}
