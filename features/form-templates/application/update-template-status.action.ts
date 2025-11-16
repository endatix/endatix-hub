"use server";

import { revalidatePath } from "next/cache";
import { updateFormTemplate } from "@/services/api";
import { Result } from "@/lib/result";
import { authorization } from "@/features/auth/permissions";

export type UpdateTemplateStatusResult = Result<string>;

export async function updateTemplateStatusAction(
  templateId: string,
  isEnabled: boolean,
): Promise<UpdateTemplateStatusResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  try {
    if (!templateId) {
      return Result.error("Template ID is required");
    }

    // Update the template status
    await updateFormTemplate(templateId, {
      isEnabled,
    });

    // Revalidate the template page and templates list
    revalidatePath(`/(main)/forms/templates/${templateId}`);
    revalidatePath("/(main)/forms/templates");

    return Result.success(templateId);
  } catch (error) {
    console.error("Error updating template status:", error);
    return Result.error(
      `Failed to update template status: ${(error as Error).message}`,
    );
  }
}
