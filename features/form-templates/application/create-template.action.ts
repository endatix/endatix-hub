"use server";

import { authorization } from "@/features/auth/authorization";
import { CreateFormTemplateRequest } from "@/lib/form-types";
import { Result } from "@/lib/result";
import { createFormTemplate } from "@/services/api";
import { revalidatePath } from "next/cache";

export async function createTemplateAction(
  formData: FormData,
): Promise<Result<string> | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  try {
    const name = formData.get("name")?.toString() || "";
    const description = formData.get("description")?.toString() || "";

    if (!name || name.trim().length === 0) {
      console.error("Template name is required");
      return Result.error("Template name is required");
    }

    const templateData: CreateFormTemplateRequest = {
      name,
      jsonData: JSON.stringify({}),
      isEnabled: true,
      description,
    };

    const result = await createFormTemplate(templateData);

    if (!result || !result.isSuccess) {
      console.error("Failed to create template:", result?.error);
      return Result.error("Failed to create template");
    }

    revalidatePath("/(main)/forms/templates");

    if (!result.formTemplateId) {
      return Result.error("Failed to create template");
    }

    return Result.success(result.formTemplateId);
  } catch (error) {
    console.error("Failed to create form template:", error);
    return Result.error("Failed to create template");
  }
}
