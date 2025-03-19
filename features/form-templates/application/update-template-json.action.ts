'use server';

import { revalidatePath } from "next/cache";
import { updateFormTemplate } from "@/services/api";

interface UpdateTemplateJsonResult {
  success: boolean;
  error?: string;
}

export async function updateTemplateJsonAction(
  templateId: string, 
  templateJson: object | null
): Promise<UpdateTemplateJsonResult> {
  try {
    if (!templateId) {
      return { success: false, error: "Template ID is required" };
    }

    if (!templateJson) {
      return { success: false, error: "Template JSON data is required" };
    }

    const jsonData = JSON.stringify(templateJson);

    await updateFormTemplate(templateId, {
      jsonData,
    });

    revalidatePath(`/forms/templates/${templateId}`);

    return { success: true };
  } catch (error) {
    console.error("Error updating template JSON:", error);
    return { 
      success: false, 
      error: `Failed to update template: ${(error as Error).message}`
    };
  }
} 