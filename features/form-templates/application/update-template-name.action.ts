"use server";

import { revalidatePath } from "next/cache";
import { updateFormTemplate } from "@/services/api";
import { Result } from "@/lib/result";
import { createPermissionService } from "@/features/auth/permissions/application";

export type UpdateTemplateNameResult = Result<string>;

export async function updateTemplateNameAction(
  templateId: string,
  name: string,
): Promise<UpdateTemplateNameResult | never> {
  const { requireHubAccess } = await createPermissionService();
  await requireHubAccess();

  try {
    if (!templateId) {
      return Result.error("Template ID is required");
    }

    if (!name || name.trim() === "") {
      return Result.error("Template name is required");
    }

    await updateFormTemplate(templateId, {
      name: name.trim(),
    });

    // Revalidate the template page and templates list
    revalidatePath(`/forms/templates/${templateId}`);
    revalidatePath("/forms/templates");

    return Result.success(templateId);
  } catch (error) {
    console.error("Error updating template name:", error);
    return Result.error(
      `Failed to update template name: ${(error as Error).message}`,
    );
  }
}
