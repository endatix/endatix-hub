"use server";

import { revalidatePath } from "next/cache";
import { updateTemplate } from "./update-template.server";
import { authorization } from "@/features/auth/authorization";
import { Result } from "@/lib/result";

export type UpdateTemplateJsonResult = Result<string>;

export async function updateTemplateJsonAction(
  templateId: string,
  templateJson: object | null,
): Promise<UpdateTemplateJsonResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  if (!templateId) {
    return Result.error("Template ID is required");
  }

  if (!templateJson) {
    return Result.error("Template JSON data is required");
  }

  const jsonData = JSON.stringify(templateJson);

  const result = await updateTemplate(templateId, {
    jsonData,
  });
  if (Result.isError(result)) return result;

  revalidatePath(`/(main)/forms/templates/${templateId}`);

  return result;
}
