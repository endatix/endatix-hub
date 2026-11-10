"use server";

import { authorization, Permissions } from "@/features/auth/authorization";
import { Result } from "@/lib/result";
import { createForm, getFormTemplate } from "@/services/api";

export type UseTemplateResult = Result<string>;

export type UseTemplateRequest = {
  templateId: string;
  folderId?: string;
};

export async function useTemplateAction(
  request: UseTemplateRequest,
): Promise<UseTemplateResult | never> {
  const { requireHubAccess, requirePermission } = await authorization();
  await requireHubAccess();
  await requirePermission(Permissions.Forms.Create);

  try {
    const template = await getFormTemplate(request.templateId);

    if (!template.jsonData) {
      return Result.error("Template has no definition");
    }

    const newForm = await createForm({
      name: `Form from template: ${template.name}`,
      isEnabled: true,
      formDefinitionJsonData: template.jsonData,
      folderId: request.folderId ?? template.folderId ?? undefined,
    });

    if (newForm.id?.length > 0) {
      return Result.success(newForm.id);
    }
  } catch (error) {
    console.error("Failed to create form", error);
  }
  return Result.error("Failed to create form");
}
