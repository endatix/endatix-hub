"use server";

import { revalidatePath } from "next/cache";
import { updateFormTemplate } from "@/services/api";
import { authorization } from "@/features/auth/authorization";
import { Result } from "@/lib/result";

export type UpdateTemplateJsonResult = Result<string>;

export async function updateTemplateJsonAction(
  templateId: string,
  templateJson: object | null,
): Promise<UpdateTemplateJsonResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  try {
    if (!templateId) {
      return Result.error("Template ID is required");
    }

    if (!templateJson) {
      return Result.error("Template JSON data is required");
    }

    const jsonData = JSON.stringify(templateJson);

    await updateFormTemplate(templateId, {
      jsonData,
    });

    revalidatePath(`/(main)/forms/templates/${templateId}`);

    return Result.success(templateId);
  } catch (error) {
    console.error("Error updating template JSON:", error);
    return Result.error(
      `Failed to update template: ${(error as Error).message}`,
    );
  }
}
