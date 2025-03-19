'use server';

import { revalidatePath } from "next/cache";
import { updateFormTemplate } from "@/services/api";

interface UpdateTemplateStatusResult {
  success: boolean;
  error?: string;
}

export async function updateTemplateStatusAction(
  templateId: string, 
  isEnabled: boolean
): Promise<UpdateTemplateStatusResult> {
  try {
    if (!templateId) {
      return { success: false, error: "Template ID is required" };
    }

    // Update the template status
    await updateFormTemplate(templateId, {
      isEnabled
    });

    // Revalidate the template page and templates list
    revalidatePath(`/forms/templates/${templateId}`);
    revalidatePath('/forms/templates');
    
    return { success: true };
  } catch (error) {
    console.error("Error updating template status:", error);
    return { 
      success: false, 
      error: `Failed to update template status: ${(error as Error).message}`
    };
  }
} 