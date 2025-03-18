"use server";

import { FormTemplate } from "@/types";
import { getFormTemplate } from "@/services/api";

export async function getTemplateAction(templateId: string): Promise<FormTemplate> {
  try {
    return await getFormTemplate(templateId);
  } catch (error) {
    console.error("Error fetching form template:", error);
    throw new Error("Failed to fetch form template");
  }
} 