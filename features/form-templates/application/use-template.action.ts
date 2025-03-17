"use server";

import { ensureAuthenticated } from "@/features/auth";
import { Result } from "@/lib/result";
import { createForm, getFormTemplate } from "@/services/api";

export type UseTemplateResult = Result<string>;

export type UseTemplateRequest = {
  templateId: string;
};

export async function useTemplateAction(
  request: UseTemplateRequest,
): Promise<UseTemplateResult> {
  await ensureAuthenticated();

  try {
    const template = await getFormTemplate(request.templateId);

    if (!template.jsonData) {
      return Result.error("Template has no definition");
    }

    const newForm = await createForm({
      name: `Form from template: ${template.name}`,
      isEnabled: true,
      formDefinitionJsonData: template.jsonData,
    });

    if (newForm.id?.length > 0) {
      return Result.success(newForm.id);
    }
  } catch (error) {
    console.error("Failed to create form", error);
  }
  return Result.error("Failed to create form");
}
