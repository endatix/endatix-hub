'use server';

import { revalidatePath } from "next/cache";
import { updateFormTemplate } from "@/services/api";

interface UpdateTemplateNameResult {
  success: boolean;
  error?: string;
}

export async function updateTemplateNameAction(
  templateId: string, 
  name: string
): Promise<UpdateTemplateNameResult> {
  try {
    if (!templateId) {
      return { success: false, error: "Template ID is required" };
    }

    if (!name || name.trim() === '') {
      return { success: false, error: "Template name is required" };
    }

    await updateFormTemplate(templateId, {
      name: name.trim()
    });

    // Revalidate the template page and templates list
    revalidatePath(`/forms/templates/${templateId}`);
    revalidatePath('/forms/templates');
    
    return { success: true };
  } catch (error) {
    console.error("Error updating template name:", error);
    return { 
      success: false, 
      error: `Failed to update template name: ${(error as Error).message}`
    };
  }
} 