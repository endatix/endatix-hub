"use server";

import { createPermissionService } from '@/features/auth/permissions/application';
import { Result } from "@/lib/result";
import { createFormTemplate, getActiveFormDefinition } from "@/services/api";

export type SaveAsTemplateRequest = {
  formId: string;
  name: string;
  description?: string;
};

export type SaveAsTemplateResult = Result<string>;

export async function saveAsTemplateAction(
  request: SaveAsTemplateRequest
): Promise<SaveAsTemplateResult | never> {
  const { requireHubAccess } = await createPermissionService();
  await requireHubAccess();

  try {
    // Get the form definition to use as template data
    const formDefinition = await getActiveFormDefinition(request.formId);

    if (!formDefinition || !formDefinition.jsonData) {
      return Result.error("Form definition not found or has no data");
    }

    // Create the template
    const templateResult = await createFormTemplate({
      name: request.name,
      description: request.description || '',
      isEnabled: true,
      jsonData: formDefinition.jsonData,
    });

    if (templateResult.isSuccess && templateResult.formTemplateId) {
      return Result.success(templateResult.formTemplateId);
    } else {
      return Result.error(templateResult.error || "Failed to create template");
    }
  } catch (error) {
    console.error("Failed to save form as template", error);
    return Result.error("Failed to save form as template");
  }
} 