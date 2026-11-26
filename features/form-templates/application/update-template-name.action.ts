"use server";

import { revalidatePath } from "next/cache";
import { updateTemplate } from "./update-template.server";
import { Result } from "@/lib/result";
import { authorization } from "@/features/auth/authorization";

export type UpdateTemplateNameResult = Result<string>;

export async function updateTemplateNameAction(
  templateId: string,
  name: string,
): Promise<UpdateTemplateNameResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  if (!templateId) {
    return Result.error("Template ID is required");
  }

  if (!name || name.trim() === "") {
    return Result.error("Template name is required");
  }

  const result = await updateTemplate(templateId, {
    name: name.trim(),
  });
  if (Result.isError(result)) return result;

  // Revalidate the template page and templates list
  revalidatePath(`/(main)/forms/templates/${templateId}`);
  revalidatePath("/(main)/forms/templates");

  return result;
}
