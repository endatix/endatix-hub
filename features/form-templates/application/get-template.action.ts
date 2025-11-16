"use server";

import { FormTemplate } from "@/types";
import { getFormTemplate } from "@/services/api";
import { authorization } from "@/features/auth/authorization";
import { Result } from "@/lib/result";

export type GetTemplateResult = Result<FormTemplate>;

export async function getTemplateAction(
  templateId: string,
): Promise<GetTemplateResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  try {
    const template = await getFormTemplate(templateId);
    return Result.success(template);
  } catch (error) {
    console.error("Error fetching form template:", error);
    return Result.error("Failed to fetch form template");
  }
}
