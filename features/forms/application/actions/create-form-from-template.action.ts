"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { Result } from "@/lib/result";
import { createForm, getFormTemplate } from "@/services/api";

export type CreateFormFromTemplateRequest = {
  templateId: string;
};

export type CreateFormFromTemplateResult = Result<string>;

export async function createFormFromTemplateAction(
  request: CreateFormFromTemplateRequest,
): Promise<CreateFormFromTemplateResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

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
    console.error("Failed to create form from template", error);
  }

  return Result.error("Failed to create form from template");
}
